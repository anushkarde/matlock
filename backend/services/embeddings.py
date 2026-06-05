import os
from openai import AsyncOpenAI

_client: AsyncOpenAI | None = None

def _get_client() -> AsyncOpenAI:
    global _client
    if _client is None:
        _client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    return _client


async def embed_text(text: str) -> list[float]:
    response = await _get_client().embeddings.create(
        model="text-embedding-3-large",
        input=text[:8000],
    )
    return response.data[0].embedding


async def embed_texts(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []
    response = await _get_client().embeddings.create(
        model="text-embedding-3-large",
        input=[t[:8000] for t in texts],
    )
    return [item.embedding for item in response.data]
