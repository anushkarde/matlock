import type {
  CaseResult,
  CaseSnippet,
  SearchForm,
  SearchResults,
} from "@/lib/searchCases"
import { exaContents, exaSearch } from "@/lib/exa"
import {
  searchOpinions,
  type CourtlistenerOpinion,
} from "@/lib/courtlistener"

export type SearchDebug = {
  courtlistenerCount: number
  mergedCount: number
}

type CandidateCase = {
  id: string
  name: string
  courtId?: string
  courtLabel: string
  year: number
  url: string
  source: "courtlistener-exa"
  summaryText?: string
}

function normalizeRuleToken(rule: string): string {
  const lower = rule.toLowerCase()
  if (lower.includes("403")) return "403"
  if (lower.includes("404")) return "404"
  if (lower.includes("401")) return "401"
  if (lower.includes("402")) return "402"
  if (lower.includes("702")) return "702"
  if (lower.includes("801") || lower.includes("807") || lower.includes("hearsay"))
    return "801"
  return rule
}

function isoDateYearsAgo(years: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

function authorityFromMeta(
  candidate: CandidateCase,
  form: SearchForm
): CaseResult["authority"] {
  const age = new Date().getFullYear() - candidate.year
  if (candidate.courtId === form.courtId) {
    return "binding"
  }
  if (candidate.courtId && candidate.courtId.endsWith("d")) {
    return "district"
  }
  if (age > 20) return "older"
  return "persuasive"
}

function issueTagsFrom(
  form: SearchForm,
  candidate: CandidateCase,
  normalizedRule: string
): string[] {
  const tags = new Set<string>()
  tags.add(`Rule ${normalizedRule}`)
  const factLower = form.factPattern.toLowerCase()

  if (factLower.includes("photo") || factLower.includes("graphic")) {
    tags.add("graphic photos")
  }
  if (factLower.includes("stipulation") || factLower.includes("stipulated")) {
    tags.add("stipulation")
  }
  if (factLower.includes("expert")) {
    tags.add("expert testimony")
  }
  if (factLower.includes("hearsay")) {
    tags.add("hearsay")
  }

  const nameLower = candidate.name.toLowerCase()
  if (nameLower.includes("unfair prejudice") || factLower.includes("prejudice")) {
    tags.add("unfair prejudice")
  }

  return Array.from(tags)
}

type JustiaContext = {
  phrases: string[]
}

function splitParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n+/g)
    .map((p) => p.trim())
    .filter((p) => p.length > 120)
}

function chooseHighlightSentence(paragraph: string): string | undefined {
  const sentences = paragraph.split(/(?<=[\.\?\!])\s+/g)
  if (sentences.length === 0) return undefined

  const keyPhrases = [
    "we hold",
    "we conclude",
    "substantially outweigh",
    "unfair prejudice",
    "probative value",
    "stipulation",
    "especially where",
    "where the fact is undisputed",
  ]

  let best: { s: string; score: number } | null = null
  for (const s of sentences) {
    const lower = s.toLowerCase()
    let score = 0
    for (const kw of keyPhrases) {
      if (lower.includes(kw)) score += 2
    }
    if (lower.length > 40 && lower.length < 280) score += 1
    if (!best || score > best.score) {
      best = { s: s.trim(), score }
    }
  }

  return best?.s ?? sentences[0]?.trim()
}

function labelForParagraph(p: string): string {
  const lower = p.toLowerCase()
  if (
    lower.includes("rule 403") ||
    lower.includes("federal rule of evidence") ||
    (lower.includes("probative value") && lower.includes("unfair prejudice"))
  ) {
    return "The test"
  }
  if (
    lower.includes("we conclude") ||
    lower.includes("we hold") ||
    lower.includes("admitted") ||
    lower.includes("excluded") ||
    lower.includes("granted") ||
    lower.includes("denied")
  ) {
    return "Why excluded/admitted"
  }
  if (
    lower.includes("especially where") ||
    lower.includes("where the fact is undisputed") ||
    lower.includes("cumulative") ||
    lower.includes("inflammatory") ||
    lower.includes("limiting instruction")
  ) {
    return "Limiting principle"
  }
  return "Key paragraph"
}

async function buildSnippetsForCase(
  candidate: CandidateCase,
  form: SearchForm,
  normalizedRule: string
): Promise<CaseSnippet[]> {
  const contents = await exaContents({ urls: [candidate.url] })
  const text = contents[0]?.text

  if (!text) {
    return [
      {
        label: "Summary",
        text:
          "Unable to extract key paragraphs from this opinion automatically. Open the opinion to review the full text.",
      },
    ]
  }

  const paragraphs = splitParagraphs(text)
  if (paragraphs.length === 0) {
    return [
      {
        label: "Summary",
        text:
          "The opinion text did not contain clearly separable paragraphs. Open the opinion to review the full text.",
      },
    ]
  }

  type ScoredP = { p: string; score: number }
  const factLower = form.factPattern.toLowerCase()

  const scored: ScoredP[] = paragraphs.map((p) => {
    const lower = p.toLowerCase()
    let score = 0
    if (lower.includes(normalizedRule)) score += 3
    if (lower.includes("probative value") && lower.includes("unfair prejudice")) {
      score += 4
    }
    if (lower.includes("stipulation")) score += 2
    if (lower.includes("graphic") || lower.includes("photo")) score += 2

    const factKeywords = ["photo", "stipulation", "expert", "hearsay"]
    for (const kw of factKeywords) {
      if (lower.includes(kw) && factLower.includes(kw)) score += 2
    }

    return { p, score }
  })

  scored.sort((a, b) => b.score - a.score)
  const top = scored.slice(0, 3)

  return top.map(({ p }) => ({
    label: labelForParagraph(p),
    text: p,
    highlight: chooseHighlightSentence(p),
  }))
}

function buildWhyFits(
  best: CaseResult,
  form: SearchForm,
  normalizedRule: string,
  justiaContext?: JustiaContext | null
): string[] {
  const bullets: string[] = []
  const factLower = form.factPattern.toLowerCase()

  bullets.push(
    `Reasoning centers on Rule ${normalizedRule}${
      normalizedRule === "403"
        ? " balancing between probative value and unfair prejudice"
        : ""
    }.`
  )

  if (factLower.includes("photo") || factLower.includes("graphic")) {
    bullets.push(
      "Dispute matches: graphic or disturbing images offered as exhibits."
    )
  }
  if (factLower.includes("stipulation")) {
    bullets.push("Fact pattern involves an offered stipulation to reduce evidentiary need.")
  }
  bullets.push(
    "Provides quotable language that can be adapted directly into your motion."
  )

  if (justiaContext && justiaContext.phrases.length > 0) {
    bullets.push(
      `Courts commonly emphasize: ${justiaContext.phrases[0]}`
    )
  }

  return bullets.slice(0, 4)
}

function normalizeCaseName(name?: string): string {
  return (name ?? "Unknown case").replace(/\s+/g, " ").trim()
}

function parseYearFromDate(date?: string): number | null {
  if (!date) return null
  const y = Number(date.slice(0, 4))
  return Number.isFinite(y) ? y : null
}

function parseYearFromString(s: string): number | null {
  const m = s.match(/(19|20)\d{2}/)
  if (!m) return null
  return Number(m[0])
}

async function exaMultiDomainSearch(
  form: SearchForm
): Promise<{
  courtlistenerCandidates: CandidateCase[]
  justiaContext: JustiaContext | null
}> {
  const baseQuery = `Find judicial opinions applying ${form.rule} to this fact pattern: ${form.factPattern}. Focus on evidentiary admissibility, motions in limine, and judicial reasoning.`

  const [exaCourtlistener, exaJustia] = await Promise.all([
    exaSearch({
      query: baseQuery,
      includeDomains: ["courtlistener.com"],
      numResults: 7,
      text: true,
    }),
    exaSearch({
      query: `How courts interpret ${form.rule} in similar evidentiary fact patterns, focusing on the structure of the test and reasons to exclude or admit evidence.`,
      includeDomains: ["justia.com"],
      numResults: 3,
      text: true,
    }),
  ])

  const nowYear = new Date().getFullYear()

  const courtlistenerCandidates: CandidateCase[] = (exaCourtlistener ?? [])
    .filter((r) => r.url && r.title)
    .map((r) => {
      const year =
        parseYearFromString(r.text ?? "") ??
        parseYearFromString(r.title ?? "") ??
        nowYear

      return {
        id: `exa-cl-${r.id}`,
        name: normalizeCaseName(r.title),
        courtId: undefined,
        courtLabel: "CourtListener",
        year,
        url: r.url,
        source: "courtlistener-exa",
        summaryText: r.text,
      }
    })

  const phrases: string[] = []
  for (const r of exaJustia ?? []) {
    if (!r.text) continue
    const firstSentence = r.text.split(/(?<=[\.\?\!])\s+/g)[0]?.trim()
    if (firstSentence && firstSentence.length > 40) {
      phrases.push(firstSentence)
    }
  }

  const justiaContext: JustiaContext | null =
    phrases.length > 0 ? { phrases } : null

  return { courtlistenerCandidates, justiaContext }
}

async function buildCandidates(
  form: SearchForm,
  normalizedRule: string
): Promise<{ candidates: CandidateCase[]; debug: SearchDebug; justiaContext: JustiaContext | null }> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/searchPipeline.ts:buildCandidates',message:'buildCandidates start',data:{rule:form.rule,courtId:form.courtId,timeWindowYears:form.timeWindowYears},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  const { courtlistenerCandidates, justiaContext } = await exaMultiDomainSearch(form)

  const key = (c: CandidateCase) => c.url.toLowerCase()

  const mergedMap = new Map<string, CandidateCase>()
  for (const c of courtlistenerCandidates) {
    const k = key(c)
    if (!mergedMap.has(k)) mergedMap.set(k, c)
  }

  const merged = Array.from(mergedMap.values())

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/searchPipeline.ts:buildCandidates',message:'buildCandidates counts',data:{courtlistenerCount:courtlistenerCandidates.length,mergedCount:merged.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  return {
    candidates: merged,
    debug: {
      courtlistenerCount: courtlistenerCandidates.length,
      mergedCount: merged.length,
    },
    justiaContext,
  }
}

export async function runSearchPipeline(
  form: SearchForm
): Promise<SearchResults & { debug?: SearchDebug }> {
  const normalizedRule = normalizeRuleToken(form.rule)
  const { candidates, debug, justiaContext } = await buildCandidates(form, normalizedRule)

  // fallback to no results if no candidates are found
  if (!candidates.length) {
    const fallback: SearchResults = {
      bestFit: {
        id: "no-results",
        name: "No cases found",
        courtLabel: "",
        year: new Date().getFullYear(),
        authority: "persuasive",
        issueTags: [`Rule ${normalizedRule}`],
        snippets: [
          {
            label: "Summary",
            text:
              "No matching cases were found. Try broadening the time window or relaxing filters.",
          },
        ],
      },
      cases: [],
      whyFits: [
        "No results matched the current filters.",
        "Try broadening the jurisdiction or time window.",
      ],
    }

    return {
      ...fallback,
      debug,
    }
  }
  const nowYear = new Date().getFullYear()
  const filtered = candidates.filter((c) => {
    const age = nowYear - c.year
    if (Number.isFinite(c.year) && age > form.timeWindowYears) {
      return false
    }
    return true
  })

  const top = filtered.slice(0, 3)

  const caseResults: CaseResult[] = []
  for (const c of top) {
    const authority = authorityFromMeta(c, form)
    const issueTags = issueTagsFrom(form, c, normalizedRule)
    const snippets = await buildSnippetsForCase(c, form, normalizedRule)

    caseResults.push({
      id: c.id,
      name: c.name,
      courtLabel: c.courtLabel,
      year: c.year,
      authority,
      issueTags,
      url: c.url,
      snippets,
    })
  }

  const bestFit = caseResults[0]
  const whyFits = buildWhyFits(bestFit, form, normalizedRule, justiaContext)

  return {
    bestFit,
    cases: caseResults,
    whyFits,
    debug: process.env.NODE_ENV !== "production" ? debug : undefined,
  }
}

