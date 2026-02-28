import httpx


async def send_chat(
    http_client: httpx.AsyncClient,
    base_url: str,
    api_key: str,
    payload: dict,
) -> dict:
    """Send a single chat completion request, returning the result or error."""
    payload = {**payload}  # shallow copy to avoid mutating caller's dict
    response_format = payload.get("response_format")
    if response_format is not None:
        has_json_mention = any(
            "json" in m.get("content", "").lower()
            for m in payload.get("messages", [])
        )
        if not has_json_mention:
            payload["messages"] = [
                {"role": "system", "content": "Respond with valid JSON output."},
                *payload["messages"],
            ]
    response = await http_client.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}"},
        json=payload,
    )
    if response.status_code != 200:
        return {"error": response.json(), "status_code": response.status_code}
    return response.json()
