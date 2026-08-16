"""Thin wrapper around the Groq chat completions API.

This used to be called directly from the browser with the API key baked
into the client bundle (VITE_GROQ_API_KEY). Moving it here means the key
never leaves the server.
"""

import httpx

import config

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
MODEL = "llama-3.1-8b-instant"


def call_groq(
    prompt: str,
    temperature: float = 0.7,
    max_tokens: int | None = None,
    json_mode: bool = False,
) -> str | None:
    """Sends a single-turn prompt to Groq and returns the raw text reply, or
    None if the key is missing, the request fails, or the response is
    malformed. Callers are expected to fall back gracefully on None.
    """
    if not config.GROQ_API_KEY:
        print("GROQ_API_KEY not set")
        return None

    body = {
        "model": MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
    }
    if max_tokens is not None:
        body["max_tokens"] = max_tokens
    if json_mode:
        body["response_format"] = {"type": "json_object"}

    try:
        response = httpx.post(
            GROQ_API_URL,
            headers={"Authorization": f"Bearer {config.GROQ_API_KEY}", "Content-Type": "application/json"},
            json=body,
            timeout=30,
        )
    except httpx.HTTPError as e:
        print(f"Groq request failed: {e}")
        return None

    if response.status_code == 429:
        print("Groq rate limit reached")
        return None
    if response.status_code != 200:
        print(f"Groq API error: {response.status_code} {response.text}")
        return None

    try:
        return response.json()["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError, ValueError):
        print("Unexpected Groq response shape")
        return None
