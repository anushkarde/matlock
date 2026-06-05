import asyncio
from fastapi import APIRouter, BackgroundTasks
from models.schemas import IngestRequest, IngestAllRequest, IngestResult
from services.ingestion import ingest_rule, DEFAULT_RULES

router = APIRouter()

# Track background ingestion progress
_ingestion_status: dict[str, str] = {}


@router.post("/rule", response_model=IngestResult)
async def ingest_single(request: IngestRequest) -> IngestResult:
    """Ingest cases for a single FRE rule. Runs synchronously; expect 30-120s."""
    return await ingest_rule(request.rule, request.num_results)


@router.post("/all")
async def ingest_all(request: IngestAllRequest, background_tasks: BackgroundTasks):
    """Kick off background ingestion for all default FRE rules."""
    async def _run():
        for rule in DEFAULT_RULES:
            _ingestion_status[rule] = "running"
            try:
                result = await ingest_rule(rule, request.num_results_per_rule)
                _ingestion_status[rule] = f"done ({result.vectors_upserted} vectors)"
            except Exception as e:
                _ingestion_status[rule] = f"error: {e}"

    background_tasks.add_task(_run)
    return {
        "message": f"Ingestion started for {len(DEFAULT_RULES)} rules",
        "rules": DEFAULT_RULES,
    }


@router.get("/status")
async def ingestion_status():
    return {"status": _ingestion_status, "default_rules": DEFAULT_RULES}
