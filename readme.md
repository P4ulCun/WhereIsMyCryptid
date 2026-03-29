# Cryptid Solver

Cryptid Solver is a full-stack web application designed to help players solve the board game [Cryptid](https://boardgamegeek.com/boardgame/246784/cryptid). By uploading a photo of your assembled game board, the application uses computer vision to parse the board's state, map out the territories, and evaluate player hints to logically deduce the location of the Cryptid.

## Tech Stack

**Frontend:**
- [React](https://reactjs.org/) & [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Lucide React](https://lucide.dev/) for icons

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) (Python)
- [Google Gemini API](https://deepmind.google/technologies/gemini/) (Vision AI for parsing the game board)
- [SQLite](https://www.sqlite.org/) (Integrated rate-limiting and quota tracking)

## Configuration Setup and running

### 1. Backend Setup
Navigate to the `backend` directory:
```bash
cd backend
```

Create an environment variables file based on the provided template:
```bash
cp .env.example .env
```
Open the newly created `.env` file and configure:
- `GOOGLE_API_KEY`: Your Gemini API access key.
- `CORS_ORIGINS`: The URL of your frontend (e.g., `http://localhost:5173` for local development).
- `ADMIN_SECRET`: A secret passcode to bypass upload limits on the frontend.
- `DAILY_GLOBAL_LIMIT` & `DAILY_IP_LIMIT`: Caps for the AI usage to protect against free tier exhaustion.

**Start the Backend (First time, to build the image):**
```bash
    docker compose up -d --build
```

**Start the Backend (Subsequent times):**
```bash
    docker compose up -d
```

*The API will be available at `http://localhost:8000`. You can view the swagger documentation at `http://localhost:8000/docs`.*

### 2. Frontend Setup
Navigate to the `frontend` directory:
```bash
cd frontend
```

Create an environment variables file:
```bash
cp .env.example .env
```
Open `.env` and configure:
- `VITE_API_URL`: The URL of your backend (leave as `http://localhost:8000` for local development).

**Start the Frontend (First time, to build the image):**
```bash
    docker compose up -d --build
```

**Start the Frontend (Subsequent times):**
```bash
    docker compose up -d
```

or 

```bash
    npm run dev
```

## Admin Override Feature
If you need to test the app extensively without hitting the IP usage limit (default 3 per day), you can trigger Admin mode tracking:
1. Run the frontend.
2. Click the "Cryptid Solver" title on the upload screen 5 times in rapid succession.
3. Enter your `ADMIN_SECRET` password when prompted.
4. Your browser will securely store this token and bypass the local and global hardware limits.