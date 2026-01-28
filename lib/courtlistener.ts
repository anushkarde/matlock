const COURTLISTENER_BASE_URL = "https://www.courtlistener.com"

const COURTLISTENER_API_TOKEN = process.env.COURTLISTENER_API_TOKEN

if (!COURTLISTENER_API_TOKEN && process.env.NODE_ENV === "development") {
  // eslint-disable-next-line no-console
  console.warn(
    "[courtlistener] COURTLISTENER_API_TOKEN is not set. Evidence search will be degraded."
  )
}

export type CourtlistenerOpinion = {
  id: number
  absolute_url: string
  caseName?: string
  dateFiled?: string
  court?: string
  // Many more fields exist; we only use a few.
}

type CourtlistenerSearchResponse = {
  results: CourtlistenerOpinion[]
}

export async function searchOpinions(params: {
  query: string
  courtId?: string
  dateMinIso?: string
  onlyPublished?: boolean
  pageSize?: number
}): Promise<CourtlistenerOpinion[]> {
  if (!COURTLISTENER_API_TOKEN) return []

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/courtlistener.ts:searchOpinions',message:'calling courtlistener',data:{hasToken:!!COURTLISTENER_API_TOKEN,courtId:params.courtId,dateMinIso:params.dateMinIso,onlyPublished:params.onlyPublished,pageSize:params.pageSize},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion

  const url = new URL(
    "/api/rest/v4/search/",
    COURTLISTENER_BASE_URL
  )
  url.searchParams.set("q", params.query)
  url.searchParams.set("type", "o") // opinions
  if (params.courtId) url.searchParams.set("court", params.courtId)
  if (params.dateMinIso) url.searchParams.set("date_filed_min", params.dateMinIso)
  if (params.onlyPublished) url.searchParams.set("order_by", "dateFiled desc")
  url.searchParams.set("page_size", String(params.pageSize ?? 25))

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Token ${COURTLISTENER_API_TOKEN}`,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    // eslint-disable-next-line no-console
    console.error(
      "[courtlistener] Search failed",
      res.status,
      await res.text().catch(() => "")
    )
    return []
  }

  const data = (await res.json()) as CourtlistenerSearchResponse
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/courtlistener.ts:searchOpinions',message:'courtlistener ok',data:{status:res.status,resultsCount:(data.results??[]).length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H4'})}).catch(()=>{});
  // #endregion
  return data.results ?? []
}

