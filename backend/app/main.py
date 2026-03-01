import asyncio
import copy
import json
import os
import re
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
import httpx
from pydantic import BaseModel, Field

from .chat import send_chat
from .db import (
    init_db,
    create_job as db_create_job,
    get_job as db_get_job,
    update_job_status,
    update_agent,
)

load_dotenv()

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")


class Message(BaseModel):
    role: str
    content: str


class JsonSchema(BaseModel):
    name: str
    strict: bool = True
    schema_: dict = Field(validation_alias="schema", serialization_alias="schema")


class ResponseFormat(BaseModel):
    type: str = "json_schema"
    json_schema: JsonSchema


class ChatRequest(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    model: str
    messages: list[Message]
    temperature: float | None = None
    response_format: ResponseFormat | None = None


class AgentSpec(BaseModel):
    model_name: str
    temperature: float | None = None
    persona: str | None = None


class CreateJobRequest(BaseModel):
    messages: list[Message]
    response_format: ResponseFormat | None = None
    agents: list[AgentSpec]


class CreateJobResponse(BaseModel):
    job_id: str
    agents: list[dict]


# Unix timestamp for Jan 1, 2025
ONE_YEAR_AGO = int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp())

http_client: httpx.AsyncClient

# Hold strong references to background tasks so they aren't garbage-collected
_background_tasks: set[asyncio.Task] = set()


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient(timeout=httpx.Timeout(120.0))
    await init_db()
    yield
    await http_client.aclose()


app = FastAPI(lifespan=lifespan)


@app.get("/")
def read_root():
    return {"health": "healthy"}


@app.get("/models")
async def get_models():
    """Fetch all model metadata from OpenRouter."""
    response = await http_client.get(f"{OPENROUTER_BASE_URL}/models")
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail="Failed to fetch models from OpenRouter",
        )
    return response.json()


@app.get("/models/structured")
async def get_structured_text_models():
    """Fetch models that accept text input, produce text output, and support structured_outputs."""
    response = await http_client.get(f"{OPENROUTER_BASE_URL}/models")
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail="Failed to fetch models from OpenRouter",
        )
    data = response.json()

    allowed_models = [
    # OpenAI – GPT-5 family
    "openai/gpt-5.2",
    "openai/gpt-5.1",
    "openai/gpt-oss-120b",

    # Google – Gemini 3.x
    "google/gemini-3.1-pro-preview",
    "google/gemini-3-flash-preview",
    "google/gemini-2.5-pro",

    # Anthropic – Claude 4.x
    "anthropic/claude-opus-4.6",
    "anthropic/claude-opus-4.5",
    "anthropic/claude-sonnet-4.6",
    "anthropic/claude-sonnet-4.5",

    # Competitive large models
    "deepseek/deepseek-v3.2",
    "z-ai/glm-5",
    "x-ai/grok-4",
    "mistralai/mistral-large-2512",
]

    filtered = [
        model
        for model in data.get("data", [])
        if model.get("id") in allowed_models
        and "text" in model.get("architecture", {}).get("input_modalities", [])
        and "text" in model.get("architecture", {}).get("output_modalities", [])
        and "structured_outputs" in model.get("supported_parameters", [])
    ]

    return {"data": filtered}


@app.post("/chat")
async def chat(request: ChatRequest):
    """Send a chat completion request to a model via OpenRouter."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=401, detail="OPENROUTER_API_KEY is not configured")
    payload = request.model_dump(exclude_none=True, by_alias=True)
    result = await send_chat(
        http_client,
        OPENROUTER_BASE_URL,
        OPENROUTER_API_KEY,
        payload,
    )
    if "error" in result:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"],
        )
    return result


@app.post("/chat_batch")
async def chat_batch(requests: list[ChatRequest]):
    """Send multiple chat completion requests in parallel."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=401, detail="OPENROUTER_API_KEY is not configured")
    async def _do(r: ChatRequest):
        payload = r.model_dump(exclude_none=True, by_alias=True)
        return await send_chat(
            http_client,
            OPENROUTER_BASE_URL,
            OPENROUTER_API_KEY,
            payload,
        )
    results = await asyncio.gather(*[_do(r) for r in requests])
    return {"results": list(results)}


@app.post("/create_job")
async def create_job(request: CreateJobRequest) -> CreateJobResponse:
    """Create a swarm job with N agents. Persists to SQLite and returns the job + agent IDs."""
    messages = [m.model_dump() for m in request.messages]
    response_format = (
        request.response_format.model_dump(by_alias=True)
        if request.response_format
        else None
    )
    agents = [a.model_dump() for a in request.agents]

    result = await db_create_job(
        messages=messages,
        response_format=response_format,
        agents=agents,
    )
    return CreateJobResponse(**result)


async def run_swarm(
    job_id: str,
    agents: list[dict],
    messages: list[dict],
    response_format: dict | None,
) -> None:
    """Background task: run all agents in parallel, update DB as results arrive."""

    async def run_single_agent(agent: dict) -> None:
        agent_id = agent["agent_id"]
        try:
            await update_agent(agent_id, status="working")

            # Build per-agent messages: deep copy to avoid cross-agent mutation
            agent_messages = copy.deepcopy(messages)
            persona = agent.get("persona")
            if persona:
                agent_messages.insert(0, {"role": "system", "content": persona})

            payload: dict = {
                "model": agent["model_name"],
                "messages": agent_messages,
            }
            if agent.get("temperature") is not None:
                payload["temperature"] = agent["temperature"]
            if response_format is not None:
                payload["response_format"] = response_format

            result = await send_chat(
                http_client,
                OPENROUTER_BASE_URL,
                OPENROUTER_API_KEY,
                payload,
            )

            if "error" in result:
                await update_agent(
                    agent_id,
                    status="error",
                    error=json.dumps(result["error"]) if isinstance(result["error"], dict) else str(result["error"]),
                )
                return

            # Parse OpenRouter response
            choice = result.get("choices", [{}])[0]
            message = choice.get("message", {})
            content = message.get("content", "")
            reasoning = message.get("reasoning", None)

            # Check for empty response
            if not content or not content.strip():
                await update_agent(
                    agent_id,
                    status="error",
                    response=content,
                    error="Empty response from model",
                )
                return

            # Validate JSON if structured output was requested
            if response_format is not None and content:
                # Strip markdown code fences if present
                stripped = content.strip()
                if stripped.startswith("```"):
                    lines = stripped.split("\n")
                    # Remove first line (```json) and last line (```)
                    lines = lines[1:]
                    if lines and lines[-1].strip() == "```":
                        lines = lines[:-1]
                    stripped = "\n".join(lines).strip()
                try:
                    json.loads(stripped)
                    content = stripped  # use the cleaned version
                except json.JSONDecodeError as e:
                    await update_agent(
                        agent_id,
                        status="error",
                        response=content,
                        error=f"Invalid JSON in structured output: {e}",
                    )
                    return

            usage = result.get("usage", {})
            input_tokens = usage.get("prompt_tokens")
            output_tokens = usage.get("completion_tokens")

            # OpenRouter may provide cost in the response or in usage
            cost = None
            if "usage" in result and "cost" in result["usage"]:
                cost = result["usage"]["cost"]

            await update_agent(
                agent_id,
                status="done",
                response=content,
                reasoning=reasoning,
                input_token=input_tokens,
                output_token=output_tokens,
                cost=cost,
            )
        except Exception as exc:
            await update_agent(
                agent_id,
                status="error",
                error=str(exc),
            )

    await asyncio.gather(*[run_single_agent(a) for a in agents])
    await update_job_status(job_id, "done")


@app.post("/start_job/{job_id}", status_code=202)
async def start_job(job_id: str):
    """Start running all agents for a job. Returns immediately; work happens in background."""
    job = await db_get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    if job["status"] != "ready":
        raise HTTPException(status_code=409, detail=f"Job is already '{job['status']}', expected 'ready'")

    await update_job_status(job_id, "working")

    task = asyncio.create_task(
        run_swarm(
            job_id=job_id,
            agents=job["agents"],
            messages=job["messages"],
            response_format=job["response_format"],
        )
    )
    _background_tasks.add(task)
    task.add_done_callback(_background_tasks.discard)

    return {"job_id": job_id, "status": "working"}


@app.get("/job/{job_id}")
async def get_job(job_id: str):
    """Get current state of a job and all its agents."""
    job = await db_get_job(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
