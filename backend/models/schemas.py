from pydantic import BaseModel
from typing import Optional


class SearchRequest(BaseModel):
    rule: str
    court_id: str = "any"
    fact_pattern: str
    prefer_binding: bool = True
    include_persuasive: bool = True
    only_published: bool = False
    time_window_years: int = 20


class CaseSnippet(BaseModel):
    label: str
    text: str
    highlight: Optional[str] = None


class CaseResult(BaseModel):
    id: str
    name: str
    court_label: str
    year: int
    authority: str  # binding | persuasive | district | older
    issue_tags: list[str]
    url: Optional[str] = None
    snippets: list[CaseSnippet]
    why_it_fits: list[str] = []
    score: float = 0.0


class RuleExplainer(BaseModel):
    title: str
    text: str


class SearchResponse(BaseModel):
    best_fit: Optional[CaseResult] = None
    cases: list[CaseResult] = []
    why_fits: list[str] = []
    rule_explainer: Optional[RuleExplainer] = None
    source: str = "vector"  # "vector" or "exa_fallback"


class IngestRequest(BaseModel):
    rule: str
    num_results: int = 20


class IngestAllRequest(BaseModel):
    num_results_per_rule: int = 15


class IngestResult(BaseModel):
    rule: str
    cases_processed: int
    vectors_upserted: int
    failed: int
