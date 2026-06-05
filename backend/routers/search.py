from fastapi import APIRouter, HTTPException
from models.schemas import SearchRequest, SearchResponse, CaseResult, CaseSnippet
from services.embeddings import embed_text
from services.vector_store import query_vectors
from services.claude_client import rank_and_extract
from services.exa_client import live_search_for_query
import hashlib

router = APIRouter()

# Map Next.js court IDs to circuit names stored in Pinecone metadata
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

MIN_VECTOR_MATCHES = 3  # Fall back to Exa if we have fewer than this many chunks


@router.post("", response_model=SearchResponse)
async def search(request: SearchRequest) -> SearchResponse:
    query_text = f"Federal Rule of Evidence {request.rule}: {request.fact_pattern}"
    query_vector = await embed_text(query_text)

    # Build filter: always filter by rule; optionally by circuit
    filter_dict: dict = {"rule": request.rule}
    circuit = COURT_TO_CIRCUIT.get(request.court_id or "")
    if circuit:
        filter_dict["court"] = circuit

    matches = query_vectors(query_vector, top_k=25, filter_dict=filter_dict)

    # Retry without circuit filter if results are thin
    if len(matches) < MIN_VECTOR_MATCHES and circuit:
        matches = query_vectors(query_vector, top_k=25, filter_dict={"rule": request.rule})

    if len(matches) < MIN_VECTOR_MATCHES:
        return await _exa_fallback(request)

    # Group chunks by case URL and keep the top-scoring chunks per case
    cases_map: dict[str, dict] = {}
    for m in matches:
        url = m["metadata"].get("url", "")
        if not url:
            continue
        if url not in cases_map:
            cases_map[url] = {
                "case_name": m["metadata"].get("case_name", "Unknown"),
                "court": m["metadata"].get("court", ""),
                "date_filed": m["metadata"].get("date_filed", ""),
                "url": url,
                "score": m["score"],
                "chunks": [],
            }
        cases_map[url]["chunks"].append(
            {"text": m["metadata"].get("text", ""), "score": m["score"]}
        )

    # Sort cases by their best chunk score; send top 8 to Claude
    sorted_cases = sorted(cases_map.values(), key=lambda c: c["score"], reverse=True)[:8]

    response = await rank_and_extract(request, sorted_cases)
    response.source = "vector"
    return response


async def _exa_fallback(request: SearchRequest) -> SearchResponse:
    results = await live_search_for_query(
        rule=request.rule,
        fact_pattern=request.fact_pattern,
        court_id=request.court_id,
        num_results=10,
    )
    if not results:
        return SearchResponse(source="exa_fallback")

    candidates = []
    for r in results[:8]:
        highlights = [h for h in (r.get("highlights") or []) if isinstance(h, str)]
        url = r.get("url", "")
        title = r.get("title", "Unknown") or "Unknown"
        case_name = title.split("|")[0].strip() if "|" in title else title
        candidates.append(
            {
                "case_name": case_name[:100],
                "court": "",
                "date_filed": (r.get("publishedDate") or "")[:10],
                "url": url,
                "score": float(r.get("score") or 0),
                "chunks": [{"text": h, "score": 1.0} for h in highlights],
            }
        )

    response = await rank_and_extract(request, candidates)
    response.source = "exa_fallback"
    return response
