AI Democracy Swarm — Agent Spec

## Project Overview

A simulation of AI democracy: spawn a swarm of agents (different providers, models, sizes, temperatures, and personas), send them the same prompt, collect structured responses, and visualize whether consensus emerges.

This is a hackathon project, so the code is not production quality. The goal is to explore the concept of AI democracy and have fun with it.
Ignore maintenance and scalability concerns for now. Focus on the core idea and implementation.
Everything should be minimal and straightforward. No need for complex architecture or optimizations.

## Tech Stack

- **Backend:** Python, FastAPI, SQLite (aiosqlite), httpx
- **Frontend:** React, TypeScript, Vite
- **LLM Gateway:** OpenRouter (`OPENROUTER_API_KEY` in `.env`)

## Backend Architecture

The backend lives in `backend/app/` with three modules:

- **main.py** — FastAPI app, route definitions, background task orchestration
- **chat.py** — Thin wrapper around OpenRouter's `/chat/completions` endpoint
- **db.py** — SQLite schema and async CRUD helpers (aiosqlite)

### Database Schema

**jobs** table: `job_id` (PK), `messages`, `response_format`, `updated_at`, `status`
**agents** table: `agent_id` (PK), `job_id` (FK), `model_name`, `temperature`, `status`, `last_update`, `response`, `reasoning`, `error`, `input_token`, `output_token`, `cost`, `persona`

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/models` | Proxy all OpenRouter models |
| GET | `/models/structured` | Filtered models: text-in/text-out, structured output support, created ≥ Jan 2025 |
| POST | `/chat` | Single chat completion (direct proxy to OpenRouter) |
| POST | `/chat_batch` | Parallel chat completions without persistence |
| POST | `/create_job` | Create a swarm job with N agents, persist to SQLite |
| POST | `/start_job/{job_id}` | Kick off all agents as background tasks (returns 202) |
| GET | `/job/{job_id}` | Poll job status and all agent results |

### Core Workflow

1. **Create job** — Client sends `messages`, optional `response_format` (JSON schema), and a list of `agents` (each with `model_name`, optional `temperature`, optional `persona`). A job + agent rows are persisted to SQLite.
2. **Start job** — All agents run concurrently via `asyncio.gather`. Each agent:
   - Prepends its persona as a system message (if set)
   - Calls OpenRouter's chat completions endpoint
   - Validates JSON if structured output was requested (strips markdown fences)
   - Records response, reasoning, token usage, and cost to SQLite
   - Status transitions: `ready` → `working` → `done` | `error`
3. **Poll job** — Client polls `/job/{job_id}` to retrieve current status and all agent responses.

### Key Details

- 120-second HTTP timeout for LLM calls
- Background tasks held in a `_background_tasks` set to prevent GC
- Auto-injects a "Respond with valid JSON" system prompt if structured output is requested but no "json" keyword appears in messages

## Frontend

React + Vite + TypeScript + Tailwind CSS. Two-view app with state-based view switching (no router).

### Structure

```
frontend/swarmy/src/
  types/index.ts          — TS interfaces (Model, Job, Agent, AgentConfig, SpawnSettings, etc.)
  api/client.ts           — fetch wrappers (fetchModels, createJob, startJob, getJob)
  constants.ts            — Default personas (8), default vote schema, spawn defaults
  hooks/
    useModels.ts          — Fetch & cache models from /api/models/structured
    useJob.ts             — Job lifecycle: create → start → poll (1.5s) → stop on done
  components/
    Layout.tsx            — Header + content shell
    shared/               — Reusable primitives (Button, StatusBadge, StatBlock, LiveIndicator, Skeleton)
    setup/                — Setup view components
      SetupView.tsx       — 2-phase orchestrator (Configure → Review)
      PromptInput.tsx     — Prompt textarea
      SchemaConfig.tsx    — Default/Custom JSON schema toggle
      SpawnConfig.tsx     — Agent count, temperature range, persona pool
      AgentList.tsx       — Editable spawned agent list
      AgentCard.tsx       — Per-agent model/temp/persona editor
      defaults.ts         — Default spawn settings constant
    results/              — Results dashboard components
      ResultsView.tsx     — Live polling dashboard
      JobHeader.tsx       — Stats (done/total, cost, elapsed) + live indicator
      ProgressTracker.tsx — 2px progress bar
      AgentTable.tsx      — Sortable table with expandable rows for raw JSON responses
  App.tsx                 — View switcher (setup | results)
  App.css                 — All component styles (design system compliant)
  index.css               — Tailwind + CSS custom properties (color tokens, fonts)
```

### Design System

- **Philosophy:** Monochrome. Precise. Signal. Color is for status only.
- **Palette:** Black (#0a0a0a) through white (#fafafa) in neutral steps. Status colors: success (#22c55e), warning (#f59e0b), error (#ef4444), pending (#3b82f6).
- **Typography:** IBM Plex Mono everywhere. IBM Plex Sans only for long prose.
- **Rules:** 2px max border-radius, 1px solid borders, no box shadows, shimmer skeletons (no spinners), one primary button per screen.

### User Flow

1. **Configure** — User types a prompt, selects response schema (default vote schema or custom JSON), sets swarm config: agent count (2–20), temperature range (evenly distributed), and persona pool (8 built-in + user-editable).
2. **Spawn** — Click "Spawn Swarm" → client generates a diverse set of agents by round-robin picking models across provider families, linearly interpolating temperatures, and cycling personas.
3. **Review** — Spawned agents appear as editable cards. User can change any agent's model, temperature, or persona, add/remove agents (min 2).
4. **Start** — Click "Start Job" → calls POST `/api/create_job` then POST `/api/start_job/{job_id}`, transitions to results view.
5. **Results** — Live polling dashboard: progress bar, stat blocks (done/total, cost, elapsed), and a data table showing status badge, model, persona, temperature, raw JSON response (truncated), and cost per agent. Click a row to expand full response + reasoning + token usage. "New Swarm" button resets to setup.

### Key Details

- Vite dev proxy: `/api/*` → `http://localhost:8000/*` (prefix stripped)
- No router library — simple `useState<'setup' | 'results'>` view switching
- No state management library — `useState` + props + custom hooks
- Polling: 1.5s interval via `setInterval`, auto-stops when `job.status === 'done'`
- Agent diversity: models grouped by provider family, round-robin selection maximizes cross-provider diversity
- Default schema: `{ verdict: "yes"|"no"|"abstain", confidence: 0-1, reasoning: string }`