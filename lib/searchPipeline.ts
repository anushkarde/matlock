import type {
  CaseResult,
  CaseSnippet,
  RuleExplainer,
  SearchForm,
  SearchResults,
} from "@/lib/searchCases"
import { exaContents, exaSearch } from "@/lib/exa"
import {
  searchOpinions,
  type CourtlistenerOpinion,
} from "@/lib/courtlistener"

// Debug info returned in dev mode to help understand what sources contributed
export type SearchDebug = {
  courtlistenerCount: number
  mergedCount: number
}

// Internal representation of a case before we enrich it with snippets and metadata
// This is what we get from Exa Search before we fetch full text via Exa Contents
type CandidateCase = {
  id: string
  name: string
  courtId?: string // Will be enriched later via CourtListener REST if needed
  courtLabel: string
  year: number
  url: string
  source: "courtlistener-exa" // All cases come from Exa searching courtlistener.com
  summaryText?: string // Initial snippet from Exa Search (not full opinion text)
}

// Normalize rule input to a canonical token (e.g., "FRE 403" -> "403")
// Used for consistent matching and labeling throughout the pipeline
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

// Convert "last N years" into an ISO date string for filtering
// Example: isoDateYearsAgo(10) -> "2016-01-28" (if today is 2026-01-28)
function isoDateYearsAgo(years: number): string {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  return d.toISOString().slice(0, 10)
}

// Determine the authority level of a case for badge display
// This is a heuristic since we don't always have full court metadata from Exa
function authorityFromMeta(
  candidate: CandidateCase,
  form: SearchForm
): CaseResult["authority"] {
  const age = new Date().getFullYear() - candidate.year
  // If court matches user's selected court, it's binding precedent
  if (candidate.courtId === form.courtId) {
    return "binding"
  }
  // CourtListener court IDs ending in "d" are district courts
  if (candidate.courtId && candidate.courtId.endsWith("d")) {
    return "district"
  }
  // Very old cases get "older" badge
  if (age > 20) return "older"
  // Otherwise it's persuasive (non-binding but potentially useful)
  return "persuasive"
}

// Generate issue tags (badges) for a case based on rule + fact pattern keywords
// These appear as small chips/badges on each case card
// TODO: This is hardcoded keyword matching; could be improved with better NLP/prompting
function issueTagsFrom(
  form: SearchForm,
  candidate: CandidateCase,
  normalizedRule: string
): string[] {
  const tags = new Set<string>()
  tags.add(`Rule ${normalizedRule}`) // Always include the rule number
  const factLower = form.factPattern.toLowerCase()

  // Keyword-based tag detection from user's fact pattern
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

  // Also check case name for additional relevant tags
  const nameLower = candidate.name.toLowerCase()
  if (nameLower.includes("unfair prejudice") || factLower.includes("prejudice")) {
    tags.add("unfair prejudice")
  }

  return Array.from(tags)
}

// Justia results are used ONLY for doctrinal context, not as cases
// This holds extracted phrases from Justia pages to enrich "why it fits" explanations
type JustiaContext = {
  phrases: string[]
}

// Remove navigation UI, ads, and other cruft from Exa-extracted text
// Exa Contents pulls raw HTML content which includes site navigation elements
// This function strips those out so we only show actual legal text
function cleanExtractedText(raw: string): string {
  // First, remove CourtListener-specific navigation patterns inline (before splitting)
  // These patterns appear within the text itself, not as separate lines
  let cleaned = raw
    // Remove CourtListener navigation sections like "### Your Notes( edit ) (none) ### Summaries (9)"
    .replace(/###\s*Your Notes\s*\(?\s*edit\s*\)?\s*\(?\s*none\s*\)?\s*###\s*Summaries\s*\(\d+\)/gi, "")
    // Remove standalone "### Your Notes" sections
    .replace(/###\s*Your Notes[^#]*/gi, "")
    // Remove standalone "### Summaries" sections
    .replace(/###\s*Summaries\s*\(\d+\)/gi, "")
    // Remove "( edit )" patterns
    .replace(/\(\s*edit\s*\)/gi, "")
    // Remove "(none)" patterns
    .replace(/\(\s*none\s*\)/gi, "")
    // Remove standalone "###" headers that are likely navigation
    .replace(/###\s*[A-Z][^#]*$/gm, "")

  const lines = cleaned
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean) // Remove empty lines

  // Patterns that indicate navigation/UI elements we want to remove
  const unwantedPatterns = [
    /please help us improve/i,
    /skip to main content/i,
    /search cornell/i,
    /cornell law school/i,
    /legal information institute/i,
    /^\[[^\]]+\]$/, // standalone bracketed nav labels like [Search Cornell]
    /^###\s*Your Notes/i,
    /^###\s*Summaries/i,
    /^\s*\(?\s*edit\s*\)?\s*$/i,
    /^\s*\(?\s*none\s*\)?\s*$/i,
  ]

  const kept = lines.filter(
    (line) => !unwantedPatterns.some((re) => re.test(line))
  )

  // Join back into a single string with normalized whitespace
  return kept.join(" ").replace(/\s+/g, " ").trim()
}

// Extract snippets using Exa's highlights feature directly

async function buildSnippetsForCase(
  candidate: CandidateCase,
  form: SearchForm,
  normalizedRule: string
): Promise<CaseSnippet[]> {
  // Query to guide Exa on what sentences to highlight
  // Focus on application + reasoning, avoid rule recitations and procedural history
  const highlightQuery =
    `Extract 1–2 sentences where the court applies FRE ${normalizedRule} ` +
    `to facts like: ${form.factPattern}. ` +
    `Prefer application + reasoning; avoid rule recitations and procedural history.`

  // Request highlights from Exa Contents (not full text)
  const contents = await exaContents({
    urls: [candidate.url],
    text: false, // Don't fetch full text, just highlights
    highlights: {
      query: highlightQuery,
      numSentences: 2, // Each highlight is 1-2 sentences
      highlightsPerUrl: 3, // Request up to 3 small excerpts per case
    },
  })

  const doc = contents?.[0]
  
  // Clean highlights: remove code blocks, navigation cruft, normalize whitespace, filter out tiny snippets
  const hs = (doc?.highlights ?? [])
    .map((h) => {
      // First remove code blocks
      let cleaned = h.replace(/```/g, "")
      // Apply comprehensive text cleaning to remove navigation/UI elements
      cleaned = cleanExtractedText(cleaned)
      // Normalize whitespace and trim
      return cleaned.replace(/\s+/g, " ").trim()
    })
    .filter((h) => h.length >= 40) // Drop tiny/empty junk

  // Fallback to summaryText if no highlights extracted
  if (!hs.length) {
    let fallback = candidate.summaryText ?? ""
    // Remove code blocks
    fallback = fallback.replace(/```/g, "")
    // Apply comprehensive text cleaning
    fallback = cleanExtractedText(fallback)
    // Normalize whitespace and trim
    fallback = fallback.replace(/\s+/g, " ").trim()

    if (fallback.length >= 40) {
      return [
        {
          label: "Key excerpt",
          text: fallback.slice(0, 280) + "…",
          highlight: fallback.slice(0, 280) + "…",
        },
      ]
    }

    return [
      {
        label: "Key excerpt",
        text: "No excerpt available for this opinion.",
      },
    ]
  }

  // Assign labels to highlights (up to 3)
  // All are labeled as "Relevant excerpt" since we're not semantically distinguishing them
  return hs.slice(0, 3).map((h) => ({
    label: "Relevant excerpt",
    text: h, // The highlight itself is the snippet text
    highlight: h, // Also use as the highlight (entire snippet is highlighted)
  }))
}

// Generate the "Why it fits" explanation text shown in the Best Fit panel
// This is a multi-sentence narrative that explains why this case is relevant
function buildWhyFits(
  best: CaseResult,
  form: SearchForm,
  normalizedRule: string,
  justiaContext?: JustiaContext | null
): string[] {
  const factLower = form.factPattern.toLowerCase()
  const bullets: string[] = []

  // First sentence: Contextual intro tying the case to the rule and user's facts
  // Build a cohesive summary paragraph that ties the rule, facts, and this case together.
  let summary = `This ${best.courtLabel || "court"} decision from ${best.year} applies Rule ${normalizedRule}`

  if (normalizedRule === "403") {
    summary += " by balancing probative value against unfair prejudice"
  } else if (normalizedRule === "404") {
    summary += " regarding character evidence and prior bad acts"
  } else if (normalizedRule === "702") {
    summary += " in evaluating expert testimony and scientific evidence"
  } else if (normalizedRule === "801") {
    summary += " in determining hearsay admissibility"
  }

  summary += " to a fact pattern similar to yours."

  // Add specific fact pattern connections
  const factConnections: string[] = []
  if (factLower.includes("photo") || factLower.includes("graphic")) {
    factConnections.push("graphic or disturbing images")
  }
  if (factLower.includes("stipulation") || factLower.includes("stipulated")) {
    factConnections.push("offered stipulations")
  }
  if (factLower.includes("expert")) {
    factConnections.push("expert testimony")
  }
  if (factLower.includes("hearsay")) {
    factConnections.push("hearsay statements")
  }

  if (factConnections.length > 0) {
    summary += ` The case addresses ${factConnections.join(" and ")}—key elements that match your situation.`
  }

  bullets.push(summary)

  // Build explanation from the case snippets
  // Use all relevant excerpts to build a cohesive explanation
  const uniqueSnippets = best.snippets
    .map((s) => s.text)
    .filter((text, index, arr) => arr.indexOf(text) === index) // Remove duplicates

  const snippetParts: string[] = []
  if (uniqueSnippets.length > 0) {
    // Use the first snippet as the main application/reasoning
    snippetParts.push(`The court's application: "${uniqueSnippets[0]}"`)
    
    // Add additional snippets if available
    if (uniqueSnippets.length > 1) {
      snippetParts.push(`Its reasoning: "${uniqueSnippets[1]}"`)
    }
    if (uniqueSnippets.length > 2) {
      snippetParts.push(`A limiting principle: "${uniqueSnippets[2]}"`)
    }
  }

  if (snippetParts.length > 0) {
    bullets.push(snippetParts.join(" "))
  }

  // Add Justia-derived common patterns if available and meaningful.
  if (justiaContext && justiaContext.phrases.length > 0) {
    const commonPattern = justiaContext.phrases.find(
      (p) => p.length > 60 && p.length < 260
    )
    if (commonPattern) {
      bullets.push(
        `Courts commonly emphasize in similar opinions that ${commonPattern}`
      )
    }
  }

  return bullets.slice(0, 4)
}

// Normalize case names (remove extra whitespace, handle undefined)
function normalizeCaseName(name?: string): string {
  return (name ?? "Unknown case").replace(/\s+/g, " ").trim()
}

// Extract year from ISO date string (e.g., "2018-03-15" -> 2018)
function parseYearFromDate(date?: string): number | null {
  if (!date) return null
  const y = Number(date.slice(0, 4))
  return Number.isFinite(y) ? y : null
}

// Extract year from text that might contain a year (e.g., "United States v. X (2018)" -> 2018)
function parseYearFromString(s: string): number | null {
  const m = s.match(/(19|20)\d{2}/)
  if (!m) return null
  return Number(m[0])
}

// Main retrieval function: Uses Exa Search to find cases and context from three domains
// This is the ONLY place where we retrieve cases - all ranking comes from Exa's semantic search
async function exaMultiDomainSearch(
  form: SearchForm,
  normalizedRule: string
): Promise<{
  courtlistenerCandidates: CandidateCase[]
  justiaContext: JustiaContext | null
  ruleExplainer: RuleExplainer | null
}> {
  // Natural language query combining rule + fact pattern
  const baseQuery =
  `Find judicial opinions that apply Federal Rule of Evidence ${normalizedRule} ` +
  `to a fact pattern like this: ${form.factPattern}. ` +
  `Prefer opinions analyzing admissibility (including motions in limine) and explaining the court’s reasoning.`

  const highlightQuery =
  `Extract the passage where the court applies Rule ${normalizedRule} ` +
  `to facts like: ${form.factPattern}. Prefer the court’s reasoning, ` +
  `balancing/test, and what evidence was admitted/excluded and why.`;

  const justiaQuery =
  `Across similar fact patterns (${form.factPattern}), summarize how courts typically apply FRE ${normalizedRule}. ` +
  `Extract recurring factors and common reasoning used to admit or exclude evidence. ` +
  `Do not focus on defining the rule; focus on application.`

  const cornellQuery =
  `Federal Rule of Evidence ${normalizedRule}: provide the rule text and a short explanation of the test/elements.`



  // Execute three Exa searches in parallel:
  // 1. CourtListener: Primary source of ranked cases (these become the case cards)
  // 2. Justia: Secondary context only (used to enrich "why it fits", NOT as cases)
  // 3. Cornell: Rule definition (becomes the rule explainer card)
  const [exaCourtlistener, exaJustia, exaCornell] = await Promise.all([
    exaSearch({
      query: baseQuery,
      includeDomains: ["courtlistener.com"],
      numResults: 7,
      text: false,
      highlights: {
        query: highlightQuery,
        numSentences: 2,
        highlightsPerUrl: 1,
      },
    }),
    exaSearch({
      query: justiaQuery,
      includeDomains: ["justia.com"],
      numResults: 3,
      text: false,
      highlights: {
        query:
          `Extract 1–2 sentences capturing recurring reasoning/factors for applying FRE ${normalizedRule} ` +
          `to fact patterns like: ${form.factPattern}.`,
        numSentences: 2,
        highlightsPerUrl: 1,
      },
    }),
    exaSearch({
      query: cornellQuery,
      includeDomains: ["law.cornell.edu"], 
      numResults: 1, // We only need one rule definition page
      text: false,
      highlights: {
        query: `Extract the rule text and the core test/elements for FRE ${normalizedRule} ` +
        `(keep it concise).`,
        numSentences: 2,
        highlightsPerUrl: 1,
      },
    }),
  ])

  const nowYear = new Date().getFullYear()

  // Convert Exa CourtListener search results into CandidateCase objects
  // These are the PRIMARY cases that will be shown to the user
  // Order matters: Exa has already ranked them semantically, so we preserve that order
  const courtlistenerCandidates: CandidateCase[] = (exaCourtlistener ?? [])
    .filter((r) => r.url && r.title && r.url.includes("/opinion/")) // Only keep opinion URLs with titles
    .map((r) => {
      // Try to extract year from highlights, title, or fallback to current year
      // Since text: false, we use highlights array if available
      const highlightText = r.highlights?.join(" ") ?? ""
      const year =
        parseYearFromString(highlightText) ??
        parseYearFromString(r.title ?? "") ??
        nowYear

      return {
        id: `exa-cl-${r.id}`, // Unique ID combining source prefix + Exa's ID
        name: normalizeCaseName(r.title),
        courtId: undefined, // Will be enriched later via CourtListener REST if needed
        courtLabel: "CourtListener", // Generic label until we get court metadata
        year,
        url: r.url, // CourtListener opinion URL
        source: "courtlistener-exa", // All cases come from Exa searching CourtListener
        summaryText: highlightText || r.text, // Use Exa highlights if available, fallback to text
      }
    })

  // Extract doctrinal phrases from Justia results
  // Justia is NOT used as a source of cases - only for context to enrich explanations
  const phrases: string[] = []
  for (const r of exaJustia ?? []) {
    if (!r.text) continue
    // Take the first sentence from each Justia result as a doctrinal phrase
    const firstSentence = r.text.split(/(?<=[\.\?\!])\s+/g)[0]?.trim()
    if (firstSentence && firstSentence.length > 40) {
      phrases.push(firstSentence)
    }
  }

  // Package Justia phrases into context object (or null if no phrases found)
  const justiaContext: JustiaContext | null =
    phrases.length > 0 ? { phrases } : null

  // Build rule explainer from Cornell result using highlights from search (not Contents)
  // This keeps it concise (2 sentences) instead of a full text dump
  let ruleExplainer: RuleExplainer | null = null
  if (exaCornell && exaCornell.length > 0) {
    const title = exaCornell[0].title ?? `${form.rule} - Federal Rules of Evidence`
    const text =
      (exaCornell[0].highlights?.join(" ") ?? "")
        .replace(/\s+/g, " ")
        .trim()

    if (text) {
      ruleExplainer = { title, text }
    }
  }

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/searchPipeline.ts:exaMultiDomainSearch',message:'ruleExplainer created',data:{hasRuleExplainer:!!ruleExplainer,title:ruleExplainer?.title,textLength:ruleExplainer?.text?.length??0,justiaPhrasesCount:justiaContext?.phrases?.length??0},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H2'})}).catch(()=>{});
  // #endregion

  return { courtlistenerCandidates, justiaContext, ruleExplainer }
}

// Orchestrates candidate retrieval and deduplication
// This is called by runSearchPipeline to get the initial ranked list of cases
async function buildCandidates(
  form: SearchForm,
  normalizedRule: string
): Promise<{ candidates: CandidateCase[]; debug: SearchDebug; justiaContext: JustiaContext | null; ruleExplainer: RuleExplainer | null }> {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/searchPipeline.ts:buildCandidates',message:'buildCandidates start',data:{rule:form.rule,courtId:form.courtId,timeWindowYears:form.timeWindowYears},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  // Get ranked cases from Exa + Justia context + Cornell rule explainer
  const { courtlistenerCandidates, justiaContext, ruleExplainer } = await exaMultiDomainSearch(form, normalizedRule)

  // Deduplicate by URL (same case might appear multiple times from different sources)
  // We preserve Exa's ranking by keeping the first occurrence of each URL
  const key = (c: CandidateCase) => c.url.toLowerCase()

  const mergedMap = new Map<string, CandidateCase>()
  for (const c of courtlistenerCandidates) {
    const k = key(c)
    if (!mergedMap.has(k)) mergedMap.set(k, c) // First occurrence wins (preserves Exa order)
  }

  const merged = Array.from(mergedMap.values())

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/searchPipeline.ts:buildCandidates',message:'buildCandidates counts',data:{courtlistenerCount:courtlistenerCandidates.length,mergedCount:merged.length},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H1'})}).catch(()=>{});
  // #endregion

  return {
    candidates: merged, // Deduplicated, Exa-ranked list of cases
    debug: {
      courtlistenerCount: courtlistenerCandidates.length,
      mergedCount: merged.length,
    },
    justiaContext, // Passed through to enrich "why it fits"
    ruleExplainer, // Passed through to show rule definition card
  }
}

// Main pipeline orchestrator: Called by the API route to execute the full search
// Returns SearchResults that the UI will render
export async function runSearchPipeline(
  form: SearchForm
): Promise<SearchResults & { debug?: SearchDebug }> {
  // Normalize rule input (e.g., "FRE 403" -> "403")
  const normalizedRule = normalizeRuleToken(form.rule)
  
  // Step 1: Retrieve ranked candidates from Exa + context from Justia + rule from Cornell
  const { candidates, debug, justiaContext, ruleExplainer } = await buildCandidates(form, normalizedRule)

  // Step 2: Handle empty results gracefully
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
  
  // Step 3: Apply time window filter (only filtering, NOT re-ranking)
  // We preserve Exa's semantic ranking - we just drop cases outside the time window
  const nowYear = new Date().getFullYear()
  const filtered = candidates.filter((c) => {
    const age = nowYear - c.year
    if (Number.isFinite(c.year) && age > form.timeWindowYears) {
      return false // Drop cases older than timeWindowYears
    }
    return true
  })

  // Step 4: Take top 3 cases (already ranked by Exa, just slice the array)
  const top = filtered.slice(0, 3)

  // Step 5: Enrich each case with snippets, tags, and authority badges
  // This is where we fetch full opinion text via Exa Contents and extract key paragraphs
  const caseResults: CaseResult[] = []
  for (const c of top) {
    const authority = authorityFromMeta(c, form) // "binding", "persuasive", "district", "older"
    const issueTags = issueTagsFrom(form, c, normalizedRule) // ["Rule 403", "graphic photos", etc.]
    const snippets = await buildSnippetsForCase(c, form, normalizedRule) // 2-3 key paragraphs with highlights

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

  // Step 6: Build "why it fits" explanation for the best case
  // This uses the case snippets + Justia context to create a narrative summary
  const bestFit = caseResults[0] // First case is the "best fit" (Exa-ranked #1)
  const whyFits = buildWhyFits(bestFit, form, normalizedRule, justiaContext)

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/e39f9e2e-6124-4643-892e-c2aec1dcf2e6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'lib/searchPipeline.ts:runSearchPipeline',message:'final response',data:{hasRuleExplainer:!!ruleExplainer,ruleExplainerTitle:ruleExplainer?.title,whyFitsCount:whyFits?.length??0,whyFitsFirst:whyFits?.[0]?.slice(0,100)},timestamp:Date.now(),sessionId:'debug-session',runId:'pre-fix',hypothesisId:'H3'})}).catch(()=>{});
  // #endregion

  // Step 7: Return final results for UI rendering
  return {
    bestFit, // The #1 ranked case (shown in "Best fit" panel)
    cases: caseResults, // All 3 cases (best fit + 2 backups, shown as cards)
    whyFits, // Multi-sentence explanation for why bestFit is relevant
    ruleExplainer: ruleExplainer ?? undefined, // Cornell rule definition card (optional)
    debug: process.env.NODE_ENV !== "production" ? debug : undefined, // Debug info in dev only
  }
}

