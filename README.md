# Swarmy

A simulation of **AI democracy**: spawn a swarm of agents across different providers, models, temperatures, and personas — send them the same prompt, collect structured responses, and visualize whether consensus emerges.

## Tech Stack

| Layer | Tech |
|-------|------|
| Backend | Python, FastAPI, SQLite (aiosqlite), httpx |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Charting | Nivo (pie, bar, heatmap) |
| Schema Builder | Radix UI, @dnd-kit, shadcn/ui patterns |
| Validation | Ajv (runtime JSON Schema validation) |
| LLM Gateway | OpenRouter |

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- An [OpenRouter](https://openrouter.ai/) API key

### Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install fastapi[standard] aiosqlite httpx python-dotenv
```

Create a `.env` file in the `backend/` directory:

```
OPENROUTER_API_KEY=sk-or-...
```

Start the server:

```bash
uvicorn app.main:app --reload
```

The API runs on `http://localhost:8000`.

### Frontend

```bash
cd frontend/swarmy
npm install
npm run dev
```

The Vite dev server runs on `http://localhost:5173` and proxies `/api` requests to the backend.

## How It Works

1. **Configure** — Type a prompt, pick a schema preset (9 built-in) or build a custom JSON schema, select models from a searchable picker, and set swarm config (agent count, temperature range, persona pool).
2. **Spawn** — Generates a diverse set of agents via round-robin model selection across provider families, linearly interpolated temperatures, and cycling personas.
3. **Review** — Spawned agents appear as editable cards. Change any agent's model, temperature, or persona before starting.
4. **Start** — Creates a job and kicks off all agents concurrently. Transitions to the results view.
5. **Results** — Live polling dashboard with a status dot grid, stat blocks (done/total, errors, cost, elapsed), auto-generated charts, and a sortable data table with schema conformance validation.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Health check |
| `GET` | `/models` | All OpenRouter models |
| `GET` | `/models/structured` | Curated allowlist of models supporting structured output |
| `POST` | `/chat` | Single chat completion |
| `POST` | `/chat_batch` | Parallel chat completions (no persistence) |
| `POST` | `/create_job` | Create a swarm job with N agents |
| `POST` | `/start_job/{job_id}` | Start all agents as background tasks (202) |
| `GET` | `/job/{job_id}` | Poll job status and agent results |

## Schema Presets

| Preset | Key Fields |
|--------|-----------|
| Democracy Vote | verdict (yes/no/abstain), confidence (0–1), reasoning |
| Trolley Problem | decision (swerve/stay/randomize), moral_principle |
| Startup Pitch | decision (invest/pass), score (1–10) |
| Prediction | probability (0–1), confidence_level |
| Rating & Review | score (1–10), pros/cons arrays |
| Fact Check | verdict (true/false/partially_true), evidence |
| Risk Assessment | risk_level, likelihood, impact |
| Sentiment Analysis | sentiment, intensity, emotions array |
| Priority Ranking | priority (P0–P4), effort |

## Visualization

Charts are auto-generated based on the response schema:

- **Enum/Boolean** → Donut chart + grouped bar chart by model
- **Numeric** → Histogram + stats (mean, median, std dev)
- **Enum × Float** → Weighted voting analysis
- **Enum × Enum** → Heatmap co-occurrence matrix
- **String** → Frequency table + sample cards

## Design

Monochrome design system — color is reserved for status only. IBM Plex Mono throughout, 2px max border-radius, no box shadows, shimmer skeletons instead of spinners.

## Project Structure

```
backend/app/
  main.py       — FastAPI routes + background task orchestration
  chat.py       — OpenRouter chat completions wrapper
  db.py         — SQLite schema + async CRUD (aiosqlite)

frontend/swarmy/src/
  App.tsx        — View switcher (setup | results)
  api/client.ts  — Fetch wrappers
  constants.ts   — Personas, schema presets, defaults
  hooks/         — useModels, useJob
  components/
    setup/       — Configuration & agent spawning
    results/     — Live dashboard + data table
    schema-builder/ — Visual JSON Schema editor
    shared/      — Reusable UI primitives
```

