# Matlock — AI Legal Research for Evidence Motions

Matlock is a legal research tool that helps litigators find the most relevant federal case law for evidence motions. Given a Federal Rule of Evidence (FRE) and a fact pattern, Matlock retrieves, semantically ranks, and summarizes the most analogous cases — including verbatim quotes from opinions — so attorneys can draft objections faster.

---

## Problem & Insight

Legal research for evidence motions is slow and tedious. A litigator preparing to argue FRE 403 exclusion needs to find cases with factually similar circumstances, in the right circuit, recent enough to be persuasive, and containing quotable language. Traditional tools (Westlaw, Lexis) require manual keyword searches and produce undifferentiated lists of citations.

Matlock's insight: semantic search over pre-embedded case text, combined with Claude's ability to extract verbatim relevant quotes, can compress hours of research into seconds. The system doesn't just retrieve cases — it explains why each case fits the specific fact pattern and surfaces the exact sentence a lawyer would cite.

The scope covers ~20 core FRE rules across federal courts, with circuit-level filtering so results match the court the attorney is actually practicing in.

---

## Technical Architecture

```
User: FRE rule + fact pattern + circuit preference
         |
         v
   [OpenAI text-embedding-3-large]  ←— 3072-dim embedding
         |
    ┌────┴────────────────────┐
    |  parallel search        |
    v                         v
[Pinecone vector DB]    [Exa Search API]
 historical cases        recent 90 days
 cosine similarity        live web
    |                         |
    └─────────┬───────────────┘
              v
    [Claude Sonnet — claude-sonnet-4-6]
     ranks top 3 cases, extracts verbatim
     quotes, classifies authority, explains
     fact-pattern fit
              |
              v
      [Next.js frontend]
```

**Backend (Python / FastAPI)**
- `backend/services/embeddings.py` — OpenAI `text-embedding-3-large` (3072 dims)
- `backend/services/vector_store.py` — Pinecone serverless index (`matlock-cases`, cosine metric)
- `backend/services/ingestion.py` — Exa → case text fetched → chunked (1200 chars, 150 overlap) → embedded → upserted to Pinecone
- `backend/services/exa_client.py` — Exa Search for ingestion and live recent-case retrieval
- `backend/services/claude_client.py` — Claude Sonnet structured prompt → JSON response with ranked cases, verbatim snippets, issue tags, authority classification
- `backend/routers/search.py` — Hybrid retrieval: Pinecone (up to 6 candidates) + Exa recent (up to 4 candidates) merged and deduped before Claude ranking
- `backend/routers/ingest.py` — Ingestion endpoint for pre-seeding Pinecone with cases per FRE rule

**Frontend (Next.js / TypeScript)**
- Input: FRE rule selector, free-text fact pattern, circuit preference, recency filters
- Output: top 3 ranked cases with verbatim quotes labeled by legal function, bullet-point explanation of fit, rule explainer, authority badges

---

## Evaluation & Evidence

**What was tested:**
- Ran 5 sample queries across different FRE rules (401, 403, 404(b), 702, 803) and manually verified that returned cases actually address those rules
- Compared Pinecone-only results vs. hybrid (Pinecone + Exa) results: hybrid consistently surfaced more recent cases that would be missing from the pre-seeded index
- Verified Claude's quote extraction against the raw case text to confirm verbatim accuracy — quotes were accurate when source text was available in the Exa highlights; paraphrasing occurred when only short excerpts were retrievable

**Known limitations:**
- Only federal rules covered; state evidence codes are out of scope
- Pinecone index is pre-seeded and won't auto-update as new opinions are published (Exa recent-cases search handles this partially for the last 90 days)
- Very old cases (pre-1990) are underrepresented in Exa's index
- Claude occasionally assigns "binding" authority incorrectly when circuit metadata is absent from case text
- District court opinions are included but labeled as lower-authority

---

## Setup & Running Locally

### Prerequisites

API keys required:

| Key | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | text-embedding-3-large embeddings |
| `ANTHROPIC_API_KEY` | Claude Sonnet for ranking/extraction |
| `PINECONE_API_KEY` | vector database |
| `EXA_API_KEY` | case retrieval and ingestion |

Create `.env.local` in the project root:

```bash
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
PINECONE_API_KEY=your_key
EXA_API_KEY=your_key
BACKEND_URL=http://localhost:8000   # for local dev
```

Create `.env` in `backend/`:

```bash
OPENAI_API_KEY=your_key
ANTHROPIC_API_KEY=your_key
PINECONE_API_KEY=your_key
EXA_API_KEY=your_key
FRONTEND_URL=http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Seed Pinecone with cases (run once):

```bash
# POST to the ingest endpoint for each rule you want indexed
curl -X POST http://localhost:8000/ingest \
  -H "Content-Type: application/json" \
  -d '{"rule": "FRE 403", "num_results": 20}'
```

### Frontend

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Process & Decisions

**Why hybrid retrieval?**
Pure vector search over a static Pinecone index would miss cases decided after ingestion. Pure live Exa search would be slower and miss cases whose full text isn't indexed by Exa. Hybrid combines a deep historical catalog with a live recency layer, merged and deduped before Claude ranking.

**Why Claude for ranking instead of re-ranking embeddings?**
Cosine similarity finds semantically close text but doesn't understand legal relevance — a case discussing FRE 403 in a footnote scores similarly to one where it's the holding. Claude can read the excerpts and distinguish. Structured JSON output also lets Claude return the exact quote labels and authority classifications the frontend needs in one pass.

**Chunking strategy:**
Cases are split at 1200-character chunks with 150-character overlap, preferring sentence boundaries. This was chosen so each chunk fits comfortably in a prompt while preserving enough context for meaningful embedding. Smaller chunks (e.g. 400 chars) produced less coherent embeddings; larger chunks approached model context limits during ingestion batch embedding.

**Major iteration:**
The initial version sent raw Exa search results directly to Claude without a vector retrieval step. This produced inconsistent results because the LLM was doing both retrieval and ranking with no semantic pre-filtering. Adding Pinecone as the primary retrieval layer and using Exa only for recent-case augmentation significantly improved result quality.

---

## AI Usage Disclosure

This project uses AI in two distinct ways:

1. **As infrastructure:** OpenAI `text-embedding-3-large` generates vector embeddings for semantic search. Claude Sonnet (`claude-sonnet-4-6`) ranks retrieved cases and extracts verbatim quotes via a structured prompt.

2. **As a development tool:** Claude Code (Anthropic's CLI) was used during development for debugging, refactoring, and writing portions of the backend routing logic.

No generated text appears in the UI that is not sourced from actual court opinions — Claude's role is to select and surface quotes from real case text, not to generate legal analysis from scratch.

---

## Sources & Credits

- [Pinecone](https://www.pinecone.io/) — serverless vector database
- [Exa](https://exa.ai/) — neural web search used for case retrieval and ingestion
- [OpenAI Embeddings API](https://platform.openai.com/docs/guides/embeddings) — `text-embedding-3-large`
- [Anthropic Claude API](https://docs.anthropic.com/) — `claude-sonnet-4-6` for ranking and extraction
- [CourtListener](https://www.courtlistener.com/) — source for federal opinion full text (accessed via Exa)
- [Next.js](https://nextjs.org/) — bootstrapped with `create-next-app`
- [shadcn/ui](https://ui.shadcn.com/) / [Radix UI](https://www.radix-ui.com/) — component primitives
- [Tailwind CSS](https://tailwindcss.com/) — styling

This project was built independently. The Next.js scaffold (`create-next-app`) and Radix/shadcn UI components are third-party starting points; all retrieval logic, ingestion pipeline, prompt engineering, and application architecture are original work.
