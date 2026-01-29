export type SearchForm = {
  rule: string
  courtId: string
  factPattern: string
  preferBinding: boolean
  includePersuasive: boolean
  onlyPublished: boolean
  timeWindowYears: number
}

export type CaseAuthority = "binding" | "persuasive" | "district" | "older"

export type CaseSnippet = {
  label: string
  text: string
  highlight?: string
}

export type CaseResult = {
  id: string
  name: string
  courtLabel: string
  year: number
  authority: CaseAuthority
  issueTags: string[]
  url?: string
  snippets: CaseSnippet[]
}

export type RuleExplainer = {
  title: string
  text: string
}

export type SearchResults = {
  bestFit: CaseResult
  cases: CaseResult[]
  whyFits: string[]
  ruleExplainer?: RuleExplainer
}

// this is called if the API call fails
function mock403Results(form: SearchForm): SearchResults {
  const primary: CaseResult = {
    id: "ca9-2018-graphic-photos",
    name: "United States v. X",
    courtLabel: "9th Cir.",
    year: 2018,
    authority: "binding",
    issueTags: ["Rule 403", "graphic photos", "stipulation"],
    url: "https://example.com/opinion/us-v-x-2018",
    snippets: [
      {
        label: "The test",
        text:
          "Rule 403 permits exclusion when the danger of unfair prejudice substantially outweighs probative value. The district court must consider the evidentiary need and whether alternatives, including stipulations, reduce that need.",
        highlight:
          "Rule 403 permits exclusion when the danger of unfair prejudice substantially outweighs probative value.",
      },
      {
        label: "Why admitted/excluded",
        text:
          "Although the photographs were undeniably graphic, they were probative of identity and intent. But especially where the fact is undisputed and a stipulation is offered, repeated inflammatory images can be unfairly prejudicial.",
        highlight:
          "especially where the fact is undisputed and a stipulation is offered, repeated inflammatory images can be unfairly prejudicial.",
      },
      {
        label: "Limiting principle",
        text:
          "Courts should prefer the least prejudicial means to prove a point when the proponent’s evidentiary need is minimal. A narrow admission with a limiting instruction often suffices.",
        highlight:
          "Courts should prefer the least prejudicial means to prove a point when the proponent’s evidentiary need is minimal.",
      },
    ],
  }

  const backup1: CaseResult = {
    id: "cand-2014-photos-stipulation",
    name: "Doe v. City of Y",
    courtLabel: "N.D. Cal.",
    year: 2014,
    authority: "district",
    issueTags: ["Rule 403", "photos", "stipulation"],
    url: "https://example.com/opinion/doe-v-city-of-y-2014",
    snippets: [
      {
        label: "Balancing",
        text:
          "The court weighed probative value against the risk the images would invite the jury to decide on an improper emotional basis. The proffered stipulation substantially reduced the probative value of additional photographs.",
        highlight:
          "The proffered stipulation substantially reduced the probative value of additional photographs.",
      },
      {
        label: "Practical framing",
        text:
          "A small number of representative images was permitted, while cumulative photographs were excluded as needlessly inflammatory.",
        highlight:
          "cumulative photographs were excluded as needlessly inflammatory.",
      },
    ],
  }

  const backup2: CaseResult = {
    id: "sdny-2001-prejudice-probative",
    name: "United States v. Z",
    courtLabel: "S.D.N.Y.",
    year: 2001,
    authority: "older",
    issueTags: ["Rule 403", "unfair prejudice", "cumulative evidence"],
    url: "https://example.com/opinion/us-v-z-2001",
    snippets: [
      {
        label: "Core quote",
        text:
          "Evidence is unfairly prejudicial when it tends to suggest decision on an improper basis, commonly an emotional one. The court may exclude cumulative exhibits where the point is adequately established by other proof.",
        highlight:
          "Evidence is unfairly prejudicial when it tends to suggest decision on an improper basis, commonly an emotional one.",
      },
      {
        label: "How to use",
        text:
          "If the opponent offers to stipulate to the fact, argue the marginal probative value is low and the prejudice risk dominates the balance.",
        highlight:
          "argue the marginal probative value is low and the prejudice risk dominates the balance.",
      },
    ],
  }

  const whyFits = [
    "The dispute is the same: graphic photos offered; stipulation offered",
    "Reasoning hinges on probative value vs unfair prejudice",
    "Reusable limiting principle: “especially where the fact is undisputed…”",
  ]

  return { bestFit: primary, cases: [primary, backup1, backup2], whyFits }
}

function mockGenericResults(form: SearchForm): SearchResults {
  const primary: CaseResult = {
    id: "generic-2019",
    name: "Example v. Example",
    courtLabel: form.courtId === "ca9" ? "9th Cir." : "Federal",
    year: 2019,
    authority: form.preferBinding ? "binding" : "persuasive",
    issueTags: [form.rule, "relevance", "foundation"],
    url: "https://example.com/opinion/example-v-example-2019",
    snippets: [
      {
        label: "Rule framing",
        text:
          "The court applies the governing evidentiary rule to the proffered proof and considers whether the jury will be assisted or misled by the evidence in context.",
        highlight:
          "The court applies the governing evidentiary rule to the proffered proof and considers whether the jury will be assisted or misled by the evidence in context.",
      },
      {
        label: "Application",
        text:
          "Because the fact pattern mirrors the disputed issue, the probative value is substantial. The opponent’s objections go to weight, not admissibility, absent a specific exclusionary basis.",
        highlight:
          "The opponent’s objections go to weight, not admissibility, absent a specific exclusionary basis.",
      },
    ],
  }

  const backup1: CaseResult = {
    id: "generic-2012",
    name: "Sample v. Sample",
    courtLabel: "N.D. Cal.",
    year: 2012,
    authority: "district",
    issueTags: [form.rule, "discretion", "balancing"],
    url: "https://example.com/opinion/sample-v-sample-2012",
    snippets: [
      {
        label: "Discretion",
        text:
          "Trial courts have broad discretion in managing evidence, including reasonable limits to avoid confusion or delay.",
        highlight: "Trial courts have broad discretion in managing evidence",
      },
    ],
  }

  const backup2: CaseResult = {
    id: "generic-2004",
    name: "Oldco v. Newco",
    courtLabel: "S.D.N.Y.",
    year: 2004,
    authority: "older",
    issueTags: [form.rule, "harmless error"],
    url: "https://example.com/opinion/oldco-v-newco-2004",
    snippets: [
      {
        label: "Fallback quote",
        text:
          "Even if the ruling was error, reversal requires a showing of substantial influence on the verdict under the governing harmless-error standard.",
        highlight:
          "reversal requires a showing of substantial influence on the verdict",
      },
    ],
  }

  const whyFits = [
    "Directly applies the selected rule and frames the governing standard",
    "Provides a quotable line that can be adapted to your motion",
    "Includes fallback authorities if the court wants additional support",
  ]

  return { bestFit: primary, cases: [primary, backup1, backup2], whyFits }
}

// call my own Next.js API route
export async function searchCases(form: SearchForm): Promise<SearchResults> {
  try {
    const res = await fetch("/api/cases/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      // eslint-disable-next-line no-console
      console.error("[searchCases] API returned", res.status)
      throw new Error("Search API failed")
    }

    const data = (await res.json()) as SearchResults
    return data
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      // eslint-disable-next-line no-console
      console.warn(
        "[searchCases] Falling back to local mock search due to error:",
        err
      )
    }

    const rule = form.rule.toLowerCase()
    if (rule.includes("403")) return mock403Results(form)
    return mockGenericResults(form)
  }
}

