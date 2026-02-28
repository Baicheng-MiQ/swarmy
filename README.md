# Swarmy

Starter full-stack project:

- `backend/`: FastAPI + SQLite
- `frontend/`: React + Vite

## Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs on `http://127.0.0.1:8000`.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

The Vite app runs on `http://127.0.0.1:5173` and proxies `/api` to the backend.

