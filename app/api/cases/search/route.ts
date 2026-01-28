import { NextResponse } from "next/server"
import { runSearchPipeline } from "@/lib/searchPipeline"
import type { SearchForm } from "@/lib/searchCases"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SearchForm

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/cases/search/route.ts:POST',message:'request received',data:{rule:body?.rule,courtId:body?.courtId,factLen:body?.factPattern?.length,preferBinding:body?.preferBinding,includePersuasive:body?.includePersuasive,onlyPublished:body?.onlyPublished,timeWindowYears:body?.timeWindowYears},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    const result = await runSearchPipeline(body)

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'app/api/cases/search/route.ts:POST',message:'pipeline result',data:{hasBestFit:!!result?.bestFit,bestFitId:result?.bestFit?.id,casesCount:result?.cases?.length,whyFitsCount:result?.whyFits?.length,hasDebug:!!(result as any)?.debug},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
    // #endregion

    return NextResponse.json(result)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[api/cases/search] error", err)

    return NextResponse.json(
      {
        error: "Search failed",
      },
      { status: 500 }
    )
  }
}

