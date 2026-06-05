import os
import httpx
from datetime import datetime, timedelta
from typing import Optional

EXA_BASE = "https://api.exa.ai"
_API_KEY = lambda: os.getenv("EXA_API_KEY", "")


async def search_recent_cases(
    rule: str,
    fact_pattern: str,
    days: int = 90,
    num_results: int = 5,
) -> list[dict]:
    """Fetch opinions published within the last `days` days. Used alongside Pinecone."""
    start_date = (datetime.utcnow() - timedelta(days=days)).strftime("%Y-%m-%dT00:00:00.000Z")
    query = f"court opinion Federal Rule of Evidence {rule}: {fact_pattern[:400]}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{EXA_BASE}/search",
            headers={"x-api-key": _API_KEY()},
            json={
                "query": query,
                "numResults": num_results,
                "type": "neural",
                "includeDomains": ["courtlistener.com"],
                "startPublishedDate": start_date,
                "contents": {
                    "highlights": {
                        "query": f"applying {rule} to facts, court reasoning and holding",
                        "numSentences": 3,
                        "highlightsPerUrl": 3,
                    }
                },
            },
        )
        if resp.status_code != 200:
            return []
        return resp.json().get("results", [])


async def search_cases(
    rule: str,
    fact_pattern: str = "",
    num_results: int = 20,
) -> list[dict]:
    query = f"court opinion applying Federal Rule of Evidence {rule}"
    if fact_pattern:
        query += f" to facts like: {fact_pattern[:300]}"

    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{EXA_BASE}/search",
            headers={"x-api-key": _API_KEY()},
            json={
                "query": query,
                "numResults": num_results,
                "type": "neural",
                "includeDomains": ["courtlistener.com"],
                "contents": {
                    "highlights": {
                        "query": f"court applied {rule} to facts, balancing test, reasoning",
                        "numSentences": 3,
                        "highlightsPerUrl": 3,
                    }
                },
            },
        )
        resp.raise_for_status()
        return resp.json().get("results", [])


async def get_case_text(url: str) -> Optional[str]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{EXA_BASE}/contents",
            headers={"x-api-key": _API_KEY()},
            json={
                "ids": [url],
                "text": {"maxCharacters": 10000},
            },
        )
        if resp.status_code != 200:
            return None
        results = resp.json().get("results", [])
        if not results:
            return None
        return results[0].get("text") or None


async def live_search_for_query(
    rule: str,
    fact_pattern: str,
    court_id: str = "any",
    num_results: int = 10,
) -> list[dict]:
    """Used as fallback when Pinecone has insufficient data."""
    query = (
        f"court opinion Federal Rule of Evidence {rule}: {fact_pattern[:400]}"
    )
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{EXA_BASE}/search",
            headers={"x-api-key": _API_KEY()},
            json={
                "query": query,
                "numResults": num_results,
                "type": "neural",
                "includeDomains": ["courtlistener.com"],
                "contents": {
                    "highlights": {
                        "query": f"applying {rule} to facts, court reasoning and holding",
                        "numSentences": 3,
                        "highlightsPerUrl": 3,
                    }
                },
            },
        )
        resp.raise_for_status()
        return resp.json().get("results", [])
