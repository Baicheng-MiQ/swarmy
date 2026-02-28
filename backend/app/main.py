import asyncio
import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
import httpx
from pydantic import BaseModel, Field

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
    model: str
    messages: list[Message]
    response_format: ResponseFormat | None = None

# Unix timestamp for Jan 1, 2025
ONE_YEAR_AGO = int(datetime(2025, 1, 1, tzinfo=timezone.utc).timestamp())

http_client: httpx.AsyncClient


@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    http_client = httpx.AsyncClient()
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
    filtered = [
        model
        for model in data.get("data", [])
        if "text" in model.get("architecture", {}).get("input_modalities", [])
        and "text" in model.get("architecture", {}).get("output_modalities", [])
        and "structured_outputs" in model.get("supported_parameters", [])
        and (model.get("created") or 0) >= ONE_YEAR_AGO
        and not any(kw in model.get("name", "").lower() for kw in ("video", "image", "audio"))
    ]
    return {"data": filtered}


@app.post("/chat")
async def chat(request: ChatRequest):
    """Send a chat completion request to a model via OpenRouter."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=401, detail="OPENROUTER_API_KEY is not configured")
    payload = request.model_dump(exclude_none=True, by_alias=True)
    # Some providers require "json" to appear in messages when using response_format
    if request.response_format is not None:
        has_json_mention = any("json" in m.content.lower() for m in request.messages)
        if not has_json_mention:
            payload["messages"].insert(0, {
                "role": "system",
                "content": "Respond with valid JSON output.",
            })
    response = await http_client.post(
        f"{OPENROUTER_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
        json=payload,
    )
    if response.status_code != 200:
        raise HTTPException(
            status_code=response.status_code,
            detail=response.json(),
        )
    return response.json()


async def _send_chat(request: ChatRequest) -> dict:
    """Send a single chat completion request, returning the result or error."""
    payload = request.model_dump(exclude_none=True, by_alias=True)
    if request.response_format is not None:
        has_json_mention = any("json" in m.content.lower() for m in request.messages)
        if not has_json_mention:
            payload["messages"].insert(0, {
                "role": "system",
                "content": "Respond with valid JSON output.",
            })
    response = await http_client.post(
        f"{OPENROUTER_BASE_URL}/chat/completions",
        headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
        json=payload,
    )
    if response.status_code != 200:
        return {"error": response.json(), "status_code": response.status_code}
    return response.json()


@app.post("/chat_batch")
async def chat_batch(requests: list[ChatRequest]):
    """Send multiple chat completion requests in parallel."""
    if not OPENROUTER_API_KEY:
        raise HTTPException(status_code=401, detail="OPENROUTER_API_KEY is not configured")
    results = await asyncio.gather(*[_send_chat(r) for r in requests])
    return {"results": list(results)}
