from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import FastAPI, HTTPException
import httpx

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

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
