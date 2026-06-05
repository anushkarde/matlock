import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from routers import search, ingest

app = FastAPI(title="Matlock Legal Research API", version="1.0.0")

_allowed_origins = [
    "http://localhost:3000",
    os.getenv("FRONTEND_URL", ""),
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[o for o in _allowed_origins if o],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(search.router, prefix="/search", tags=["search"])
app.include_router(ingest.router, prefix="/ingest", tags=["ingest"])


@app.get("/health")
async def health():
    return {"status": "ok"}
