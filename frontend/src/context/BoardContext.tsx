import React, { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type { Hint } from '../components/HintSelector';

// 1. Types perfectly aligned with the new lowercase Python Enums
export type TerrainType = 'water' | 'swamp' | 'forest' | 'desert' | 'mountain';
export type AnimalTerritoryType = 'none' | 'bear' | 'cougar';
export type StructureType = 'none' | 'shack' | 'standing_stone';

export interface Hexagon {
  id: string; // Frontend-only property
  q: number;
  r: number;
  terrain: TerrainType;
  animal_territory: AnimalTerritoryType;
  structure?: StructureType;
  structure_color?: string | null;
  is_shadowed: boolean; // Frontend-only property
}

export interface DetectedPiece {
  piece_number: number;
  is_flipped: boolean;
  grid_position: number;
}

export interface StructureData {
  structure_type: string;
  color: string;
  piece_number: number;
  local_row: number;
  local_col: number;
}

interface BoardState {
  hexes: Hexagon[];
  pieces: DetectedPiece[];
  structures: StructureData[];
  isLoading: boolean;
  error: string | null;
  updateHex: (id: string, updates: Partial<Hexagon>) => void;
  fetchBoardState: (file: File) => Promise<void>;
  evaluateHints: (hints: Hint[]) => Promise<void>;
  updatePiece: (gridPosition: number, pieceNumber: number, isFlipped: boolean) => Promise<void>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const BoardContext = createContext<BoardState | undefined>(undefined);

// Helper to generate a dummy grid (matching the 108 hexes of Cryptid)
const generateMockGrid = (): Hexagon[] => {
  const grid: Hexagon[] = [];
  const width = 12; // q (columns)
  const height = 9; // r (rows)

  const terrains: TerrainType[] = ['water', 'swamp', 'forest', 'desert', 'mountain'];

  for (let q = 0; q < width; q++) {
    for (let r = 0; r < height; r++) {
      grid.push({
        id: `${q}-${r}`,
        q,
        r,
        terrain: terrains[Math.floor(Math.random() * terrains.length)],
        animal_territory: 'none',
        structure: 'none',
        structure_color: null,
        is_shadowed: false
      });
    }
  }
  return grid;
};

export const BoardProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [hexes, setHexes] = useState<Hexagon[]>(generateMockGrid());
  const [pieces, setPieces] = useState<DetectedPiece[]>([]);
  const [structures, setStructures] = useState<StructureData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateHex = (id: string, updates: Partial<Hexagon>) => {
    setHexes(prev => prev.map(hex =>
      hex.id === id ? { ...hex, ...updates } : hex
    ));
  };

  // 2. Real API integration connecting to FastAPI
  const fetchBoardState = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const adminToken = localStorage.getItem('adminToken');
      const headers: Record<string, string> = {};
      if (adminToken) {
        headers['X-Admin-Token'] = adminToken;
      }

      const response = await fetch(`${API_BASE_URL}/parse-image`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        if (response.status === 429) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.detail || "You have reached your daily limit. Come back tomorrow!");
        }
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform backend HexNodes into frontend Hexagons by adding UI state
      const mappedHexes: Hexagon[] = data.hexes.map((node: any) => ({
        id: `${node.q}-${node.r}`,
        q: node.q,
        r: node.r,
        terrain: node.terrain,
        animal_territory: node.territory,
        structure: node.structure_type || 'none',
        structure_color: node.structure_color,
        is_shadowed: false
      }));

      setHexes(mappedHexes);
      setPieces(data.pieces || []);
      setStructures(data.structures || []);
    } catch (err: any) {
      console.error("Failed to parse board:", err);
      setError(err.message || "Failed to parse image");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const evaluateHints = useCallback(async (hints: Hint[]) => {
    setIsLoading(true);
    setError(null);

    try {
      const boardStatePayload = {
        hexes: hexes.map(h => ({
          q: h.q,
          r: h.r,
          terrain: h.terrain,
          territory: h.animal_territory,
          structure_type: h.structure === 'none' ? null : h.structure,
          structure_color: h.structure_color || null
        }))
      };

      const response = await fetch(`${API_BASE_URL}/evaluate-hints`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          board_state: boardStatePayload,
          hints: hints
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      const shadowedIds: string[] = data.shadowed_hex_ids;

      setHexes(prev => prev.map(hex => ({
        ...hex,
        is_shadowed: shadowedIds.includes(hex.id)
      })));
    } catch (err: any) {
      console.error("Failed to evaluate hints:", err);
      setError(err.message || "Failed to evaluate hints");
    } finally {
      setIsLoading(false);
    }
  }, [hexes]);

  const updatePiece = useCallback(async (gridPosition: number, pieceNumber: number, isFlipped: boolean) => {
    setIsLoading(true);
    setError(null);

    const updatedPiece: DetectedPiece = {
      grid_position: gridPosition,
      piece_number: pieceNumber,
      is_flipped: isFlipped
    };

    try {
      const response = await fetch(`${API_BASE_URL}/update-piece`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pieces,
          structures,
          updated_piece: updatedPiece
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      const mappedHexes: Hexagon[] = data.hexes.map((node: any) => ({
        id: `${node.q}-${node.r}`,
        q: node.q,
        r: node.r,
        terrain: node.terrain,
        animal_territory: node.territory,
        structure: node.structure_type || 'none',
        structure_color: node.structure_color,
        is_shadowed: false
      }));

      setHexes(mappedHexes);
      setPieces(data.pieces || []);
      setStructures(data.structures || []);
    } catch (err: any) {
      console.error("Failed to update piece:", err);
      setError(err.message || "Failed to update piece");
    } finally {
      setIsLoading(false);
    }
  }, [pieces, structures]);

  return (
    <BoardContext.Provider value={{ hexes, pieces, structures, isLoading, error, updateHex, fetchBoardState, evaluateHints, updatePiece }}>
      {children}
    </BoardContext.Provider>
  );
};

export const useBoard = () => {
  const context = useContext(BoardContext);
  if (context === undefined) {
    throw new Error('useBoard must be used within a BoardProvider');
  }
  return context;
};