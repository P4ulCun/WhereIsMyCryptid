import base64
import json
import os
from contextlib import asynccontextmanager
from enum import Enum
from typing import List, Optional, Tuple, Dict

import cv2
import numpy as np
from fastapi import FastAPI, File, HTTPException, UploadFile, Request, Header
from database import get_usage, increment_usage
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from google.genai import types

# ---------------------------------------------------------------------------
# Domain Models & Enums
# ---------------------------------------------------------------------------

class Terrain(str, Enum):
    WATER = "water"
    SWAMP = "swamp"
    FOREST = "forest"
    DESERT = "desert"
    MOUNTAIN = "mountain"

class Territory(str, Enum):
    BEAR = "bear"
    COUGAR = "cougar"
    NONE = "none"

class StructureType(str, Enum):
    SHACK = "shack"
    STONE = "standing_stone"

# ---------------------------------------------------------------------------
# API Models
# ---------------------------------------------------------------------------

# Represents the raw output from Gemini
class StructureData(BaseModel):
    structure_type: StructureType = Field(description="'Shack' or 'Stone'")
    color: str = Field(description="e.g., 'White', 'Blue', 'Green', 'Black'")
    piece_number: int = Field(description="The number of the piece (1-6) this structure is on")
    local_row: int = Field(description="Visual row index (0-2) from the top of the piece as seen in the image")
    local_col: int = Field(description="Visual column index (0-5) from the left of the piece as seen in the image")

class DetectedPiece(BaseModel):
    piece_number: int = Field(description="The number printed on the piece (1-6)")
    is_flipped: bool = Field(description="True if the number is in the bottom-right, False if top-left")
    grid_position: int = Field(description="Position on board 0-5 (0=TopLeft, 1=TopRight, 2=MidLeft, 3=MidRight, 4=BotLeft, 5=BotRight)")

class DetectionResult(BaseModel):
    pieces: List[DetectedPiece]
    structures: List[StructureData]

# Represents the final logical state of the 108-hex board
class HexNode(BaseModel):
    q: int
    r: int
    terrain: Terrain
    territory: Territory
    structure_type: Optional[StructureType] = None
    structure_color: Optional[str] = None

class BoardState(BaseModel):
    hexes: List[HexNode]
    pieces: List[DetectedPiece] = Field(default_factory=list)
    structures: List[StructureData] = Field(default_factory=list)

class Hint(BaseModel):
    id: str
    isNegative: bool
    distance: str
    target1: str
    target2: Optional[str] = None

class EvaluationRequest(BaseModel):
    board_state: BoardState
    hints: List[Hint]

class UpdatePieceRequest(BaseModel):
    pieces: List[DetectedPiece]
    structures: List[StructureData]
    updated_piece: DetectedPiece

# ---------------------------------------------------------------------------
# Hardcoded Piece Database (Terrain & Territories)
# ---------------------------------------------------------------------------
# Maps piece_number -> 3x6 array of (Terrain, Territory)
# Coordinates are based on the unflipped orientation (number in top-left)

W, S, F, D, M = Terrain.WATER, Terrain.SWAMP, Terrain.FOREST, Terrain.DESERT, Terrain.MOUNTAIN
B, C, N = Territory.BEAR, Territory.COUGAR, Territory.NONE

PIECE_DB: Dict[int, List[List[Tuple[Terrain, Territory]]]] = {
    1: [
        [(W, N), (W, N), (W, N), (W, N), (F, N), (F, N)],
        [(S, N), (S, N), (W, N), (D, N), (F, N), (F, N)],
        [(S, N), (S, N), (D, N), (D, B), (D, B), (F, B)]
    ],
    2: [
        [(S, C), (F, C), (F, C), (F, N), (F, N), (F, N)],
        [(S, N), (S, N), (F, N), (D, N), (D, N), (D, N)],
        [(S, N), (M, N), (M, N), (M, N), (M, N), (D, N)]
    ],
    3: [
        [(S, N), (S, N), (F, N), (F, N), (F, N), (W, N)],
        [(S, C), (S, C), (F, N), (M, N), (W, N), (W, N)],
        [(M, C), (M, C), (M, N), (M, N), (W, N), (W, N)]
    ],
    4: [
        [(D, N), (D, N), (M, N), (M, N), (M, N), (M, N)],
        [(D, N), (D, N), (M, N), (W, N), (W, N), (W, C)],
        [(D, N), (D, N), (D, N), (F, N), (F, N), (F, C)]
    ],
    5: [
        [(S, N), (S, N), (S, N), (M, N), (M, N), (M, N)],
        [(S, N), (D, N), (D, N), (W, N), (M, N), (M, B)],
        [(D, N), (D, N), (W, N), (W, N), (W, B), (W, B)]
    ],
    6: [
        [(D, B), (D, N), (S, N), (S, N), (S, N), (F, N)],
        [(M, B), (M, N), (S, N), (S, N), (F, N), (F, N)],
        [(M, N), (W, N), (W, N), (W, N), (W, N), (F, N)]
    ],
}

# ---------------------------------------------------------------------------
# Board Builder Logic
# ---------------------------------------------------------------------------

def build_board_state(detection: DetectionResult) -> BoardState:
    """
    Translates the 6 detected pieces and structures into a flat list of 108 HexNodes.
    Handles piece rotations and global coordinate mapping.
    """
    hexes = []
    
    # Map structures by visual location for quick lookup: (piece_number, visual_row, visual_col) -> StructureData
    struct_map = {}
    for struct in detection.structures:
        struct_map[(struct.piece_number, struct.local_row, struct.local_col)] = struct

    for dp in detection.pieces:
        piece_data = PIECE_DB.get(dp.piece_number)
        if not piece_data:
            continue

        # Calculate global offset based on grid_position
        # 0: (0,0), 1: (0,6), 2: (3,0), 3: (3,6), 4: (6,0), 5: (6,6)
        row_offset = (dp.grid_position // 2) * 3
        col_offset = (dp.grid_position % 2) * 6

        # Iterate over the 3x6 visual grid of the placed piece
        for visual_r in range(3):
            for visual_c in range(6):
                
                # If flipped, map the visual coordinate to the inverted physical coordinate
                physical_r = 2 - visual_r if dp.is_flipped else visual_r
                physical_c = 5 - visual_c if dp.is_flipped else visual_c
                
                terrain, territory = piece_data[physical_r][physical_c]
                
                # Check if Gemini detected a structure at this visual coordinate
                struct = struct_map.get((dp.piece_number, visual_r, visual_c))
                
                global_r = row_offset + visual_r
                global_c = col_offset + visual_c

                hexes.append(HexNode(
                    q=global_c,
                    r=global_r,
                    terrain=terrain,
                    territory=territory,
                    structure_type=struct.structure_type if struct else None,
                    structure_color=struct.color if struct else None
                ))

    return BoardState(
        hexes=hexes,
        pieces=detection.pieces,
        structures=detection.structures
    )


# ---------------------------------------------------------------------------
# App lifespan
# ---------------------------------------------------------------------------

client: genai.Client = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY environment variable is not set")
    client = genai.Client(api_key=api_key)
    yield
    await client.aclose()


app = FastAPI(title="Cryptid Solver Backend", lifespan=lifespan)

cors_origins_env = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
cors_origins = [origin.strip() for origin in cors_origins_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Board extraction
# ---------------------------------------------------------------------------

async def extract_board(cv_image: np.ndarray, debug: bool = False, skip_api: bool = False) -> BoardState:
    """
    Extract the Cryptid board state from an OpenCV BGR image using Gemini.
    """
    if cv_image is None or cv_image.size == 0:
        return BoardState(hexes=[])

    if skip_api:
        # Fallback payload to test the hex builder logic
        mock_result = DetectionResult(
            pieces=[
                DetectedPiece(piece_number=1, is_flipped=False, grid_position=0),
                DetectedPiece(piece_number=2, is_flipped=True, grid_position=1),
                DetectedPiece(piece_number=3, is_flipped=False, grid_position=2),
                DetectedPiece(piece_number=4, is_flipped=True, grid_position=3),
                DetectedPiece(piece_number=5, is_flipped=False, grid_position=4),
                DetectedPiece(piece_number=6, is_flipped=True, grid_position=5),
            ],
            structures=[
                StructureData(structure_type=StructureType.SHACK, color="Blue", piece_number=1, local_row=1, local_col=2)
            ]
        )
        return build_board_state(mock_result)

    _, encoded_img = cv2.imencode('.jpg', cv_image)
    img_bytes = encoded_img.tobytes()

    prompt = (
        "You are a computer vision assistant for the board game Cryptid. "
        "The image provided is a fully assembled Cryptid game board. "
        "The board is made of 6 rectangular pieces arranged in a 3 rows by 2 columns grid. "
        "Identify the 6 pieces, their orientations, and any structures placed on the board.\n\n"
        "1. Pieces: Each piece has a number (1-6). It can be flipped (number in bottom-right) or not (number in top-left). "
        "Indicate its grid_position from 0 to 5 (0=Top-Left, 1=Top-Right, 2=Mid-Left, 3=Mid-Right, 4=Bot-Left, 5=Bot-Right).\n"
        "2. Structures: Identify any colored Shacks (triangular) or Stones (octagonal columns). "
        "For each structure, provide its color, the piece_number it sits on, and its local visual coordinates on that piece "
        "(local_row: 0-2 from top, local_col: 0-5 from left).\n"
        "Return a JSON object matching the requested schema exactly."
    )

    response = await client.aio.models.generate_content(
        model='gemini-2.5-flash',
        contents=[
            types.Part.from_bytes(data=img_bytes, mime_type='image/jpeg'),
            prompt
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=DetectionResult,
            temperature=0.0
        )
    )

    try:
        detection_data = json.loads(response.text)
        detection_result = DetectionResult(**detection_data)
        return build_board_state(detection_result)
    except Exception as e:
        print(f"Error parsing Gemini response: {e}")
        return BoardState(hexes=[])


# ---------------------------------------------------------------------------
# Cryptid constraint logic
# ---------------------------------------------------------------------------

def oddq_to_cube(q: int, r: int) -> Tuple[int, int, int]:
    x = q
    z = r - (q - (q & 1)) // 2
    y = -x - z
    return x, y, z

def hex_distance(hex1: HexNode, hex2: HexNode) -> int:
    x1, y1, z1 = oddq_to_cube(hex1.q, hex1.r)
    x2, y2, z2 = oddq_to_cube(hex2.q, hex2.r)
    return max(abs(x1 - x2), abs(y1 - y2), abs(z1 - z2))

def solve_cryptid_logic(board_state: BoardState, hints: List[Hint]) -> List[str]:
    eliminated_hexes = set()
    
    for candidate in board_state.hexes:
        is_valid = True
        
        for hint in hints:
            matches_hint = False
            
            if hint.distance == 'on':
                if candidate.terrain.value in [hint.target1, hint.target2]:
                    matches_hint = True
                    
            elif hint.distance == 'within_1':
                # Target is either a terrain, or "either_animal" (bear or cougar)
                for other in board_state.hexes:
                    if hex_distance(candidate, other) <= 1:
                        if hint.target1 == 'either_animal':
                            if other.territory.value in ['bear', 'cougar']:
                                matches_hint = True
                                break
                        else:
                            if other.terrain.value == hint.target1:
                                matches_hint = True
                                break
                                
            elif hint.distance == 'within_2':
                # Target is shack, standing_stone, bear, or cougar
                for other in board_state.hexes:
                    if hex_distance(candidate, other) <= 2:
                        if hint.target1 in ['shack', 'standing_stone']:
                            if other.structure_type is not None and other.structure_type.value == hint.target1:
                                matches_hint = True
                                break
                        elif hint.target1 in ['bear', 'cougar']:
                            if other.territory.value == hint.target1:
                                matches_hint = True
                                break
                                
            elif hint.distance == 'within_3':
                # Target is structure color (white, blue, green, black)
                for other in board_state.hexes:
                    if hex_distance(candidate, other) <= 3:
                        if other.structure_color is not None and other.structure_color.lower() == hint.target1.lower():
                            matches_hint = True
                            break
            
            # Apply negation
            if hint.isNegative:
                matches_hint = not matches_hint
                
            if not matches_hint:
                is_valid = False
                break
                
        if not is_valid:
            eliminated_hexes.add(f"{candidate.q}-{candidate.r}")
            
    return list(eliminated_hexes)


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.post("/parse-image", response_model=BoardState)
async def parse_image(
    request: Request,
    file: UploadFile = File(...), 
    debug: bool = False,
    x_admin_token: Optional[str] = Header(None)
):
    try:
        # Check Admin override
        admin_secret = os.getenv("ADMIN_SECRET")
        is_admin = (admin_secret and x_admin_token == admin_secret)
        
        client_ip = "unknown"
        if not is_admin:
            # Check Global limit
            daily_global_limit = int(os.getenv("DAILY_GLOBAL_LIMIT", "100"))
            global_usage = get_usage("global")
            if global_usage >= daily_global_limit:
                raise HTTPException(status_code=429, detail="Global daily limit reached. Try again tomorrow.")
            
            # Check IP limit
            daily_ip_limit = int(os.getenv("DAILY_IP_LIMIT", "3"))
            client_ip = request.headers.get("X-Forwarded-For", request.client.host if request.client else "unknown")
            client_ip = client_ip.split(",")[0].strip() # Handle proxies
            
            ip_usage = get_usage(f"ip:{client_ip}")
            if ip_usage >= daily_ip_limit:
                raise HTTPException(status_code=429, detail=f"You have reached your daily limit of {daily_ip_limit} uploads. Come back tomorrow!")

            # Increment usage 
            increment_usage("global")
            increment_usage(f"ip:{client_ip}")

        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        cv_image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

        if cv_image is None:
            raise HTTPException(status_code=400, detail="Invalid image file")

        board_state = await extract_board(cv_image, debug=debug)
        return board_state
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/evaluate-hints")
async def evaluate_hints(request: EvaluationRequest):
    shadowed_hex_ids = solve_cryptid_logic(request.board_state, request.hints)
    return {"shadowed_hex_ids": shadowed_hex_ids}


@app.post("/update-piece", response_model=BoardState)
async def update_piece(request: UpdatePieceRequest):
    new_pieces = []
    found = False
    for p in request.pieces:
        if p.grid_position == request.updated_piece.grid_position:
            new_pieces.append(request.updated_piece)
            found = True
        else:
            new_pieces.append(p)
            
    if not found:
        new_pieces.append(request.updated_piece)

    detection_result = DetectionResult(
        pieces=new_pieces,
        structures=request.structures
    )
    return build_board_state(detection_result)


@app.get("/health")
async def health():
    return {"status": "ok"}