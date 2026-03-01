AI Democracy Swarm — Agent Spec

## Project Overview

A simulation of AI democracy: spawn a swarm of agents (different providers, models, sizes, temperatures, and personas), send them the same prompt, collect structured responses, and visualize whether consensus emerges.

This is a hackathon project, so the code is not production quality. The goal is to explore the concept of AI democracy and have fun with it.
Ignore maintenance and scalability concerns for now. Focus on the core idea and implementation.
Everything should be minimal and straightforward. No need for complex architecture or optimizations.

## Tech Stack

- **Backend:** Python, FastAPI, SQLite (aiosqlite), httpx
- **Frontend:** React, TypeScript, Vite, Tailwind CSS v4
- **Charting:** Nivo (@nivo/pie, @nivo/bar, @nivo/heatmap)
- **Schema Builder UI:** Radix UI primitives, @dnd-kit, shadcn/ui patterns
- **Validation:** Ajv (runtime JSON Schema validation)
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
| GET | `/models/structured` | Curated allowlist of models: text-in/text-out, structured output support |
| POST | `/chat` | Single chat completion (direct proxy to OpenRouter) |
| POST | `/chat_batch` | Parallel chat completions without persistence |
| POST | `/create_job` | Create a swarm job with N agents, persist to SQLite |
| POST | `/start_job/{job_id}` | Kick off all agents as background tasks (returns 202) |
| GET | `/job/{job_id}` | Poll job status and all agent results |

#### `/models/structured` Allowlist

The structured models endpoint uses a hardcoded allowlist of frontier models rather than date-based filtering:

- **OpenAI:** gpt-5.2, gpt-5.1, gpt-oss-120b
- **Google:** gemini-3.1-pro-preview, gemini-3-flash-preview, gemini-2.5-pro
- **Anthropic:** claude-opus-4.6, claude-opus-4.5, claude-sonnet-4.6, claude-sonnet-4.5
- **Others:** deepseek-v3.2, glm-5, grok-4, mistral-large-2512

Models must still pass runtime checks: text input modality, text output modality, and `structured_outputs` in `supported_parameters`.

### Core Workflow

1. **Create job** — Client sends `messages`, optional `response_format` (JSON schema), and a list of `agents` (each with `model_name`, optional `temperature`, optional `persona`). A job + agent rows are persisted to SQLite.
2. **Start job** — All agents run concurrently via `asyncio.gather`. Each agent:
   - Prepends its persona as a system message (if set)
   - Calls OpenRouter's chat completions endpoint
   - Validates JSON if structured output was requested (strips markdown fences)
   - Checks for empty responses and marks as error
   - Records response, reasoning, token usage, and cost to SQLite
   - Status transitions: `ready` → `working` → `done` | `error`
3. **Poll job** — Client polls `/job/{job_id}` to retrieve current status and all agent responses.

### Key Details

- 120-second HTTP timeout for LLM calls
- Background tasks held in a `_background_tasks` set to prevent GC
- Auto-injects a "Respond with valid JSON" system prompt if structured output is requested but no "json" keyword appears in messages
- Empty model responses are caught and marked as errors

## Frontend

React + Vite + TypeScript + Tailwind CSS v4. Two-view app with state-based view switching (no router).

### Structure

```
frontend/swarmy/src/
  types/index.ts          — TS interfaces (Model, Job, Agent, AgentConfig, SpawnSettings, etc.)
  api/client.ts           — fetch wrappers (fetchModels, createJob, startJob, getJob)
  constants.ts            — Default personas (8), 9 schema presets, spawn defaults, polling config
  hooks/
    useModels.ts          — Fetch & cache models from /api/models/structured
    useJob.ts             — Job lifecycle: create → start → poll (1s) → stop on done/timeout (90s)
  components/
    Layout.tsx            — Header + content shell (animated gradient title, decorative elements)
    shared/               — Reusable primitives (Button, StatusBadge, StatBlock, LiveIndicator, Skeleton)
    setup/                — Setup view components
      SetupView.tsx       — 2-phase orchestrator (Configure → Review)
      PromptInput.tsx     — Prompt textarea
      SchemaConfig.tsx    — Preset grid (9 presets) + integrated SchemaBuilder
      ModelSelector.tsx   — Searchable model picker grouped by provider family
      SpawnConfig.tsx     — Agent count (1–1000), temperature range, persona pool
      AgentList.tsx       — Editable spawned agent list
      AgentCard.tsx       — Per-agent model/temp/persona editor
      defaults.ts         — Default spawn settings constant
    schema-builder/       — Visual JSON Schema editor
      SchemaBuilder.tsx   — Main builder with drag-and-drop reordering (@dnd-kit)
      PropertyEditor.tsx  — Per-property editor (name, type, required, description, enums)
      EnumEditor.tsx      — Enum value chip editor (add/remove)
      ArrayTypeEditor.tsx — Array items type selector
      ObjectTypeEditor.tsx— Recursive nested object property editor
      SchemaHeader.tsx    — Schema name + strict mode controls
      SchemaOutput.tsx    — Live JSON preview with copy button
      types/schema.ts     — SchemaProperty, SchemaDefinition types
      types.ts            — PropertyEditorProps interface
      utils/
        schemaUtils.ts    — generateSchemaJSON, validateSchema
        useSchemaState.ts — Schema editor state management hook
        utils.ts          — cn() utility (clsx + tailwind-merge)
      ui/                 — shadcn/ui-style primitives (alert, button, card, input,
                            scroll-area, select, switch, tooltip) using Radix UI
    results/              — Results dashboard components
      ResultsView.tsx     — Live polling dashboard with timeout banner
      JobHeader.tsx       — Stats (done/total, errors, cost, elapsed) + live indicator
      ProgressTracker.tsx — Colored dot grid (status per agent)
      AgentTable.tsx      — Sortable table with schema conformance validation (Ajv)
      viz/                — Schema-driven auto-visualization
        SwarmViz.tsx      — Orchestrator: introspects schema, renders appropriate charts
        schemaIntrospect.ts — Schema field classification + data extraction helpers
        nivoTheme.ts      — Dark Nivo theme + categorical color palette
        EnumChart.tsx     — Donut chart + grouped bar chart (by model) for enum/boolean fields
        NumberChart.tsx   — Histogram with stats (mean, median, std dev) for numeric fields
        EnumFloatChart.tsx— Weighted voting analysis (enum × float cross-field)
        CrossFieldChart.tsx— Heatmap for enum × enum co-occurrence
        StringCards.tsx   — Frequency table + sample cards for string fields
  App.tsx                 — View switcher (setup | results)
  App.css                 — All component styles (design system compliant, ~1400 lines)
  index.css               — Tailwind v4 + CSS custom properties (color tokens, fonts, dark theme)
```

### Design System

- **Philosophy:** Monochrome. Precise. Signal. Color is for status only.
- **Palette:** Black (#0a0a0a) through white (#fafafa) in neutral steps. Status colors: success (#22c55e), warning (#f59e0b), error (#ef4444), pending (#3b82f6).
- **Typography:** IBM Plex Mono everywhere. IBM Plex Sans only for long prose.
- **Rules:** 2px max border-radius, 1px solid borders, no box shadows, shimmer skeletons (no spinners), one primary button per screen.
- **Hybrid styling:** App.css covers the main app design system; the schema builder uses Tailwind/shadcn patterns with Radix UI primitives.

### Schema Presets

9 built-in schema presets selectable from a card grid:

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

Users can also build fully custom schemas with the visual SchemaBuilder (supports nested objects, arrays, enums, drag-and-drop reordering, strict mode, and real-time validation).

### Visualization System

The results view auto-generates charts based on the schema structure via `schemaIntrospect.ts`:

1. **Enum/Boolean fields** → Donut chart (value distribution) + Grouped bar chart (votes by model)
2. **Numeric fields** → Histogram + stat block (mean, median, std dev, range)
3. **Enum × Float pairs** → Weighted voting analysis (raw vs. confidence-weighted counts)
4. **Enum × Enum pairs** → Heatmap co-occurrence matrix
5. **String fields** → Frequency table (top 8) + sample response cards

Charts use a 9-color categorical palette and a custom dark Nivo theme matching the app's monochrome design.

### User Flow

1. **Configure** — User types a prompt, selects a schema preset (9 built-in) or builds a custom schema with the visual editor, selects models via searchable family-grouped picker, sets swarm config: agent count (1–1000), temperature range (evenly distributed), and persona pool (8 built-in + user-editable).
2. **Spawn** — Click "Spawn Swarm" → client generates a diverse set of agents by round-robin picking models across provider families, linearly interpolating temperatures, and cycling personas.
3. **Review** — Spawned agents appear as editable cards. User can change any agent's model, temperature, or persona, add/remove agents (min 2).
4. **Start** — Click "Start Job" → calls POST `/api/create_job` then POST `/api/start_job/{job_id}`, transitions to results view.
5. **Results** — Live polling dashboard: colored dot grid (status per agent), stat blocks (done/total, errors, cost, elapsed), auto-generated charts (donut, histogram, heatmap, etc.), and a sortable data table with schema conformance column (Ajv validation ✓/✗). Click a row to expand full JSON response (react-json-beautifier) + reasoning + validation errors + token usage. Timeout banner appears after 90s. "New Swarm" button resets to setup.

### Key Details

- Vite dev proxy: `/api/*` → `http://localhost:8000/*` (prefix stripped)
- No router library — simple `useState<'setup' | 'results'>` view switching
- No state management library — `useState` + props + custom hooks
- Polling: 1s interval via `setInterval`, auto-stops when `job.status === 'done'` or 90s timeout
- 90s job timeout: unfinished agents marked as error client-side
- Agent diversity: models grouped by provider family, round-robin selection maximizes cross-provider diversity
- Default agent count: 20
- Schema conformance: each agent response validated against the request schema using Ajv at render time
- Default schema: `{ verdict: "yes"|"no"|"abstain", confidence: 0-1, reasoning: string }`