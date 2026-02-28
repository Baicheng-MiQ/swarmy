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

React + Vite + TypeScript scaffold (default Vite template, not yet implemented).