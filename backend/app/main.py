from fastapi import FastAPI, HTTPException
import httpx

app = FastAPI()

OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"


@app.get("/")
def read_root():
    return {"health": "healthy"}


@app.get("/models")
async def get_models():
    """Fetch all model metadata from OpenRouter."""
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{OPENROUTER_BASE_URL}/models")
        if response.status_code != 200:
            raise HTTPException(
                status_code=response.status_code,
                detail="Failed to fetch models from OpenRouter",
            )
        return response.json()

