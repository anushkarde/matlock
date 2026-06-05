export const runtime = "nodejs"

import { NextResponse } from "next/server"
import type { SearchForm, SearchResults, CaseResult, CaseSnippet } from "@/lib/searchCases"

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000"

// Transform Python snake_case response into the TypeScript SearchResults shape
// the frontend components already know how to render.
function transformResponse(data: Record<string, unknown>): SearchResults {
  const transformSnippet = (s: Record<string, unknown>): CaseSnippet => ({
    label: (s.label as string) || "Relevant excerpt",
    text: (s.text as string) || "",
    highlight: (s.highlight as string | undefined) || (s.text as string) || undefined,
  })

  const transformCase = (c: Record<string, unknown>): CaseResult => ({
    id: (c.id as string) || "unknown",
    name: (c.name as string) || "Unknown",
    courtLabel: (c.court_label as string) || "Federal",
    year: (c.year as number) || new Date().getFullYear(),
    authority: (c.authority as CaseResult["authority"]) || "persuasive",
    issueTags: (c.issue_tags as string[]) || [],
    url: (c.url as string | undefined) || undefined,
    snippets: ((c.snippets as Record<string, unknown>[]) || []).map(transformSnippet),
  })

  const cases = ((data.cases as Record<string, unknown>[]) || []).map(transformCase)
  const bestFitRaw = data.best_fit as Record<string, unknown> | null
  const bestFit = bestFitRaw ? transformCase(bestFitRaw) : cases[0]

  const whyFits = (data.why_fits as string[]) || []

  const ruleExplainerRaw = data.rule_explainer as Record<string, unknown> | null
  const ruleExplainer = ruleExplainerRaw
    ? {
        title: (ruleExplainerRaw.title as string) || "",
        text: (ruleExplainerRaw.text as string) || "",
      }
    : undefined

  return { bestFit, cases, whyFits, ruleExplainer }
}

export async function POST(request: Request) {
  try {
    const form = (await request.json()) as SearchForm

    const response = await fetch(`${BACKEND_URL}/search`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rule: form.rule,
        court_id: form.courtId || "any",
        fact_pattern: form.factPattern,
        prefer_binding: form.preferBinding,
        include_persuasive: form.includePersuasive,
        only_published: form.onlyPublished,
        time_window_years: form.timeWindowYears,
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      console.error("[api/cases/search] backend error", response.status, text)
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = (await response.json()) as Record<string, unknown>
    return NextResponse.json(transformResponse(data))
  } catch (err) {
    console.error("[api/cases/search] error", err)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
