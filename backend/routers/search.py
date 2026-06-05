import asyncio
from fastapi import APIRouter
from models.schemas import SearchRequest, SearchResponse
from services.embeddings import embed_text
from services.vector_store import query_vectors
from services.claude_client import rank_and_extract
from services.exa_client import live_search_for_query, search_recent_cases

router = APIRouter()

COURT_TO_CIRCUIT: dict[str, str] = {
    "ca1": "1st Circuit",
    "ca2": "2nd Circuit",
    "ca3": "3rd Circuit",
    "ca4": "4th Circuit",
    "ca5": "5th Circuit",
    "ca6": "6th Circuit",
    "ca7": "7th Circuit",
    "ca8": "8th Circuit",
    "ca9": "9th Circuit",
    "ca10": "10th Circuit",
    "ca11": "11th Circuit",
    "cadc": "D.C. Circuit",
    "cafe": "Federal Circuit",
    "scotus": "Supreme Court",
}

MIN_VECTOR_MATCHES = 3
MAX_VECTOR_CANDIDATES = 6   # top Pinecone cases sent to Claude
MAX_RECENT_CANDIDATES = 4   # top Exa-recent cases appended


def _exa_results_to_candidates(results: list[dict]) -> list[dict]:
    """Normalize raw Exa search results into the candidate dict format."""
    candidates = []
    for r in results:
        highlights = [h for h in (r.get("highlights") or []) if isinstance(h, str)]
        if not highlights:
            continue
        url = r.get("url", "")
        title = (r.get("title") or "Unknown")
        case_name = title.split("|")[0].strip() if "|" in title else title
        candidates.append(
            {
                "case_name": case_name[:100],
                "court": "",
                "date_filed": (r.get("publishedDate") or "")[:10],
                "url": url,
                "score": float(r.get("score") or 0.6),
                "chunks": [{"text": h, "score": 0.6} for h in highlights],
                "source": "exa_recent",
            }
        )
    return candidates


@router.post("", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    query_text = f"Federal Rule of Evidence {request.rule}: {request.fact_pattern}"

    # Run embedding, Pinecone query, and Exa recent search all in parallel
    filter_dict: dict = {"rule": request.rule}
    circuit = COURT_TO_CIRCUIT.get(request.court_id or "")
    if circuit:
        filter_dict["court"] = circuit

    query_vector, exa_recent_results = await asyncio.gather(
        embed_text(query_text),
        search_recent_cases(request.rule, request.fact_pattern, days=90, num_results=MAX_RECENT_CANDIDATES),
    )

    # Pinecone similarity search (sync but fast — run after embedding is ready)
    matches = query_vectors(query_vector, top_k=25, filter_dict=filter_dict)

    # Retry without circuit filter if sparse
    if len(matches) < MIN_VECTOR_MATCHES and circuit:
        matches = query_vectors(query_vector, top_k=25, filter_dict={"rule": request.rule})

    # --- Build Pinecone candidates ---
    vector_cases: dict[str, dict] = {}
    for m in matches:
        url = m["metadata"].get("url", "")
        if not url:
            continue
        if url not in vector_cases:
            vector_cases[url] = {
                "case_name": m["metadata"].get("case_name", "Unknown"),
                "court": m["metadata"].get("court", ""),
                "date_filed": m["metadata"].get("date_filed", ""),
                "url": url,
                "score": m["score"],
                "chunks": [],
                "source": "vector",
            }
        vector_cases[url]["chunks"].append(
            {"text": m["metadata"].get("text", ""), "score": m["score"]}
        )

    top_vector = sorted(vector_cases.values(), key=lambda c: c["score"], reverse=True)[
        :MAX_VECTOR_CANDIDATES
    ]

    # --- Build Exa-recent candidates, dedup against Pinecone ---
    existing_urls = {c["url"] for c in top_vector}
    recent_candidates = [
        c for c in _exa_results_to_candidates(exa_recent_results)
        if c["url"] not in existing_urls
    ][:MAX_RECENT_CANDIDATES]

    # --- Merge: historical deep catalog first, recent appended ---
    merged = top_vector + recent_candidates

    if not merged:
        return await _exa_fallback(request)

    source = "hybrid" if recent_candidates else "vector"
    response = await rank_and_extract(request, merged)
    response.source = source
    return response


async def _exa_fallback(request: SearchRequest) -> SearchResponse:
    """Full Exa search — only used when Pinecone has no data at all for this rule."""
    results = await live_search_for_query(
        rule=request.rule,
        fact_pattern=request.fact_pattern,
        court_id=request.court_id,
        num_results=10,
    )
    if not results:
        return SearchResponse(source="exa_fallback")

    candidates = _exa_results_to_candidates(results[:8])
    response = await rank_and_extract(request, candidates)
    response.source = "exa_fallback"
    return response
