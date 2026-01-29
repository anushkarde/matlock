const EXA_BASE_URL = "https://api.exa.ai"

const EXA_API_KEY = process.env.EXA_API_KEY
// eslint-disable-next-line no-console
console.log("[exa] has key on this deployment?", !!process.env.EXA_API_KEY)

if (!EXA_API_KEY && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.warn(
    "[exa] EXA_API_KEY is not set. Evidence search will fall back to local stubs."
  )
}

type ExaSearchRequest = {
  query: string
  numResults?: number
  includeDomains?: string[]
  excludeDomains?: string[]
  text?: boolean
  highlights?: {
    query?: string
    numSentences?: number
    highlightsPerUrl?: number
  }
}

export type ExaSearchResult = {
  id: string
  url: string
  title?: string
  text?: string
  score?: number
  highlights?: string[]
}

type ExaSearchResponse = {
  results: ExaSearchResult[]
}

type ExaContentsRequest =
  | { ids: string[]; text?: boolean; highlights?: { query: string; numSentences?: number; highlightsPerUrl?: number } }
  | { urls: string[]; text?: boolean; highlights?: { query: string; numSentences?: number; highlightsPerUrl?: number } }

export type ExaContentItem = {
  id?: string
  url: string
  text?: string
  highlights?: string[]
}

type ExaContentsResponse = {
  results: ExaContentItem[]
}

async function exaFetch<T>(path: string, body: unknown): Promise<T | null> {
  if (!EXA_API_KEY) return null

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/exa.ts:exaFetch',message:'calling exa',data:{path,hasKey:!!EXA_API_KEY},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  const res = await fetch(`${EXA_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": EXA_API_KEY,
    },
    body: JSON.stringify(body),
    // Exa is always called from the server
    cache: "no-store",
  })

  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error("[exa] Request failed", path, res.status)
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/exa.ts:exaFetch',message:'exa non-200',data:{path,status:res.status},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
    // #endregion
    return null
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/exa.ts:exaFetch',message:'exa ok',data:{path,status:res.status},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  return (await res.json()) as T
}

export async function exaSearch(
  req: ExaSearchRequest
): Promise<ExaSearchResult[]> {
  const body: Record<string, unknown> = {
    query: req.query,
    numResults: req.numResults ?? 10,
    includeDomains: req.includeDomains,
    excludeDomains: req.excludeDomains,
    text: req.text ?? true,
  }

  // Add highlights if provided (when text is false, highlights can be used instead)
  if (req.highlights) {
    body.highlights = req.highlights
  }

  const data = await exaFetch<ExaSearchResponse>("/search", body)

  return data?.results ?? []
}

export async function exaContents(
  req: ExaContentsRequest
): Promise<ExaContentItem[]> {
  const basePayload = "ids" in req
    ? { ids: req.ids }
    : { urls: req.urls }

  const payload: Record<string, unknown> = {
    ...basePayload,
    text: req.text ?? true,
  }

  // Add highlights if provided
  if (req.highlights) {
    payload.highlights = req.highlights
  }

  const data = await exaFetch<ExaContentsResponse>("/contents", payload)
  return data?.results ?? []
}

