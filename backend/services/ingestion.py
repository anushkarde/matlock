import asyncio
import hashlib
import re
from services.embeddings import embed_texts
from services.vector_store import upsert_vectors
from services.exa_client import search_cases, get_case_text
from models.schemas import IngestResult

CHUNK_SIZE = 1200   # characters
CHUNK_OVERLAP = 150


def chunk_text(text: str) -> list[str]:
    if len(text) <= CHUNK_SIZE:
        return [text.strip()] if text.strip() else []

    chunks: list[str] = []
    start = 0
    while start < len(text):
        end = start + CHUNK_SIZE
        if end < len(text):
            # Break at sentence boundary when possible
            boundary = text.rfind(". ", start + CHUNK_SIZE // 2, end)
            if boundary != -1:
                end = boundary + 1

        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        start = end - CHUNK_OVERLAP

    return chunks


_CIRCUIT_PATTERNS = [
    (r"1st Cir", "1st Circuit"),
    (r"2d Cir|2nd Cir", "2nd Circuit"),
    (r"3d Cir|3rd Cir", "3rd Circuit"),
    (r"4th Cir", "4th Circuit"),
    (r"5th Cir", "5th Circuit"),
    (r"6th Cir", "6th Circuit"),
    (r"7th Cir", "7th Circuit"),
    (r"8th Cir", "8th Circuit"),
    (r"9th Cir", "9th Circuit"),
    (r"10th Cir", "10th Circuit"),
    (r"11th Cir", "11th Circuit"),
    (r"D\.C\. Cir", "D.C. Circuit"),
    (r"Fed\. Cir", "Federal Circuit"),
    (r"S\. Ct\.|U\.S\.\s+\d", "Supreme Court"),
]


def parse_circuit(title: str) -> str:
    for pattern, name in _CIRCUIT_PATTERNS:
        if re.search(pattern, title, re.IGNORECASE):
            return name
    if re.search(r"F\.\s*Supp", title):
        return "District Court"
    return "Unknown"


async def ingest_rule(rule: str, num_results: int = 20) -> IngestResult:
    results = await search_cases(rule=rule, num_results=num_results)

    vectors: list[dict] = []
    cases_processed = 0
    failed = 0

    for result in results:
        url = result.get("url", "")
        if not url or "/opinion/" not in url:
            failed += 1
            continue

        title = result.get("title", "") or ""
        case_name = title.split("|")[0].strip() if "|" in title else title
        published_date = (result.get("publishedDate") or "")[:10]
        circuit = parse_circuit(title)

        # Use Exa highlights as fallback text source
        highlights = result.get("highlights") or []
        highlight_text = " ".join(h for h in highlights if isinstance(h, str))

        # Try to fetch full opinion text; fall back to highlights
        full_text = await get_case_text(url)
        text_to_chunk = full_text if (full_text and len(full_text) > 300) else highlight_text

        if not text_to_chunk or len(text_to_chunk) < 50:
            failed += 1
            continue

        chunks = chunk_text(text_to_chunk)
        if not chunks:
            failed += 1
            continue

        # Embed all chunks for this case in one API call
        embeddings = await embed_texts(chunks)

        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            vec_id = hashlib.md5(f"{url}:{i}".encode()).hexdigest()
            vectors.append(
                {
                    "id": vec_id,
                    "values": embedding,
                    "metadata": {
                        "case_name": case_name[:200],
                        "court": circuit,
                        "date_filed": published_date,
                        "url": url[:500],
                        "rule": rule,
                        "text": chunk[:1000],
                        "chunk_index": i,
                    },
                }
            )

        cases_processed += 1

    vectors_upserted = upsert_vectors(vectors)

    return IngestResult(
        rule=rule,
        cases_processed=cases_processed,
        vectors_upserted=vectors_upserted,
        failed=failed,
    )


DEFAULT_RULES = [
    "FRE 401", "FRE 402", "FRE 403", "FRE 404", "FRE 404(b)",
    "FRE 407", "FRE 408", "FRE 412", "FRE 501",
    "FRE 601", "FRE 608", "FRE 609",
    "FRE 702", "FRE 703", "FRE 704",
    "FRE 801", "FRE 802", "FRE 803", "FRE 804", "FRE 807",
]
