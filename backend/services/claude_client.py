import os
import json
import re
import hashlib
import anthropic
from models.schemas import SearchRequest, CaseResult, CaseSnippet, RuleExplainer, SearchResponse

_client: anthropic.AsyncAnthropic | None = None

def _get_client() -> anthropic.AsyncAnthropic:
    global _client
    if _client is None:
        _client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    return _client


EXTRACT_PROMPT = """You are a legal research assistant for litigators preparing evidence motions.

The litigator needs cases applying **{rule}** to this fact pattern:
"{fact_pattern}"

Below are candidate cases retrieved by semantic vector search. Each includes the most relevant text excerpts.

Your tasks:
1. Select the **3 best** cases — most factually analogous and most authoritative for this fact pattern
2. For each case, extract **1-3 verbatim quotes** directly from the text excerpts showing how the court applied {rule} to similar facts. Use exact words from the text, do NOT paraphrase.
3. Assign a short (2-5 word) label to each quote (e.g. "The balancing test", "Why excluded", "Limiting principle")
4. Write **2-4 bullet points** explaining why each case fits the litigator's specific fact pattern
5. Classify authority: "binding" = same circuit as user requested, "persuasive" = different circuit, "district" = district court, "older" = pre-2000
6. Extract or infer: case name, short court label (e.g. "9th Cir.", "S.D.N.Y."), year (integer), and issue tags (3-5 short keyword phrases)

Return ONLY valid JSON — no markdown fences, no explanation before or after:
{{
  "cases": [
    {{
      "name": "United States v. Example",
      "court_label": "9th Cir.",
      "year": 2020,
      "authority": "binding",
      "url": "https://www.courtlistener.com/opinion/...",
      "issue_tags": ["Rule 403", "graphic photos", "unfair prejudice"],
      "snippets": [
        {{"label": "The balancing test", "text": "exact verbatim quote from text", "highlight": "most important clause"}},
        {{"label": "Why excluded", "text": "another exact verbatim quote"}}
      ],
      "why_it_fits": [
        "Directly addresses the balancing of probative vs prejudicial value for graphic evidence",
        "Court held that a stipulation reduces probative need, which mirrors your fact pattern",
        "Quotable holding: paste the key sentence here"
      ]
    }}
  ],
  "rule_title": "FRE {rule_num} — {short_name}",
  "rule_summary": "One plain-English sentence describing what {rule} governs and when it applies."
}}

CANDIDATE CASES:
{cases_text}"""


def _build_cases_text(candidates: list[dict]) -> str:
    parts = []
    for i, case in enumerate(candidates[:8]):
        parts.append(f"--- CASE {i+1} ---")
        parts.append(f"Name: {case.get('case_name', 'Unknown')}")
        parts.append(f"Court: {case.get('court', '')}")
        parts.append(f"Date: {case.get('date_filed', '')}")
        parts.append(f"URL: {case.get('url', '')}")
        parts.append("Relevant excerpts:")
        for chunk in case.get("chunks", [])[:3]:
            text = chunk.get("text", "").strip()
            if text:
                parts.append(f'  "{text[:700]}"')
        parts.append("")
    return "\n".join(parts)


def _url_to_id(url: str) -> str:
    return f"cl-{hashlib.md5(url.encode()).hexdigest()[:12]}"


async def rank_and_extract(request: SearchRequest, candidates: list[dict]) -> SearchResponse:
    rule_num = request.rule.upper().replace("FRE ", "").replace("RULE ", "").strip()
    cases_text = _build_cases_text(candidates)

    prompt = EXTRACT_PROMPT.format(
        rule=request.rule,
        rule_num=rule_num,
        fact_pattern=request.fact_pattern[:600],
        cases_text=cases_text,
    )

    message = await _get_client().messages.create(
        model="claude-sonnet-4-6",
        max_tokens=4096,
        messages=[{"role": "user", "content": prompt}],
    )

    raw = message.content[0].text.strip()

    # Strip markdown fences if present
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        # Last-ditch: find the outermost JSON object
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        if not match:
            raise ValueError(f"Claude returned non-JSON: {raw[:300]}")
        data = json.loads(match.group())

    case_results: list[CaseResult] = []
    for c in data.get("cases", []):
        snippets = [
            CaseSnippet(
                label=s.get("label", "Relevant excerpt"),
                text=s.get("text", ""),
                highlight=s.get("highlight") or s.get("text"),
            )
            for s in c.get("snippets", [])
            if s.get("text")
        ]

        url = c.get("url", "")
        case_results.append(
            CaseResult(
                id=_url_to_id(url) if url else f"case-{len(case_results)}",
                name=c.get("name", "Unknown"),
                court_label=c.get("court_label", "Federal"),
                year=int(c.get("year", 2020)),
                authority=c.get("authority", "persuasive"),
                issue_tags=c.get("issue_tags", [request.rule]),
                url=url or None,
                snippets=snippets,
                why_it_fits=c.get("why_it_fits", []),
            )
        )

    rule_explainer = None
    if data.get("rule_summary"):
        rule_explainer = RuleExplainer(
            title=data.get("rule_title", f"Federal Rule of Evidence {rule_num}"),
            text=data["rule_summary"],
        )

    best_fit = case_results[0] if case_results else None
    why_fits = best_fit.why_it_fits if best_fit else []

    return SearchResponse(
        best_fit=best_fit,
        cases=case_results,
        why_fits=why_fits,
        rule_explainer=rule_explainer,
        source="vector",
    )
