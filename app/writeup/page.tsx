"use client"

import * as React from "react"
import { HeroHeader } from "@/components/header"
import { Card } from "@/components/ui/card"

export default function WriteupPage() {
  return (
    <>
      <HeroHeader />
      <main className="min-h-[100svh] px-6 py-14 sm:py-20">
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:gap-8">
            <div className="text-center">
              <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Writeup
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl text-balance text-sm sm:text-base">
                Learn more about how Matlock helps you find the best cases for your evidence motions.
              </p>
            </div>
          </div>

          <div className="mt-12 space-y-8">
            <Card className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-4">About Matlock</h2>
              <div className="text-muted-foreground leading-relaxed space-y-4">
                <p className="font-semibold text-primary">
                  Evidence law is decided by paragraphs, not rules. Matlock finds the ones courts actually rely on.
                </p>
                
                <p>
                  The Federal Rules of Evidence are intentionally brief—runtime constraints on what a factfinder may hear. In practice, though, admissibility turns on how courts have applied those rules to concrete fact patterns: which details mattered, what reasoning controlled, and where the court said so. Fairness and efficiency hinge less on rule text than on judicial interpretation.
                </p>
                
                <p>
                  Today, litigators uncover that reasoning by opening dozens of PDFs, skimming opinions, and manually stitching arguments together under intense time pressure. This process is slow, error-prone, and disproportionately favors firms with the resources to absorb hours of junior associate labor [STAT: avg. hours spent on evidentiary research per motion / cost per associate hour].
                </p>
                
                <p>
                In an age of instant information, our justice system still runs on manual search and institutional memory. Matlock changes that—surfacing the reasoning courts actually rely on, and making justice verifiable, transparent, and accessible to all.
                </p>
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-4">The Challenge</h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  Litigation teams—associates, clerks, public defenders, and prosecutors—face a persistent last-mile research problem. FRE disputes hinge on how similar facts were treated in similar contexts, not on the rule text itself. Yet most legal research tools are database-driven: they return many documents, not the right paragraph.
                </p>
                
                <p className="leading-relaxed">
                  Under real courtroom constraints—hearings, objections, motions in limine—lawyers need something much more precise: a short quote, a pin cite, and jurisdictionally relevant support they can stand behind. Instead, junior staff spend hours synthesizing cases that senior attorneys rarely have time to fully verify [STAT: frequency of evidentiary objections / prep time before hearings]. The result is slower preparation, inconsistent arguments, and unnecessary cognitive load for disputes that recur across cases.
                </p>
                
                <p className="leading-relaxed">
                  What litigators actually need is fact-pattern–driven retrieval, objection-ready outputs, and speed in live or near-live contexts. Incumbent products—Westlaw, LexisNexis, CourtListener—optimize for completeness and recall, not semantic similarity, excerpt extraction, or compression into a usable unit of argument.
                </p>
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-4">The Product</h2>
              <div className="space-y-6 text-muted-foreground">
                <div className="space-y-3">
                  <p>
                    You give Matlock three inputs: a rule, a short fact pattern, and a jurisdiction. It returns
                    what matters: the exact quoted language a court relied on, with a pin cite, plus
                    jurisdictionally relevant backup cases — all in one place.
                  </p>
                  <p>
                    The initial pilot scopes narrowly to 1–2 FRE rules (e.g. 403, 404(b), 901), drawing from
                    CourtListener opinions, Justia mirrors, and Cornell LII for rule text. For each query,
                    Matlock returns one primary case (quote + pin cite), one or two supporting cases in the same
                    circuit, and a brief explanation of fit. The success metric is deliberately practical:
                    would you feel comfortable standing up in court with this?
                  </p>
                </div>

                <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-6">
                  <p className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
                    Input → Output Flow
                  </p>
                  <div className="grid items-center gap-4 md:grid-cols-[minmax(0,1.2fr)_auto_minmax(0,1.2fr)]">
                    <div className="space-y-3">
                      <div className="rounded-xl border bg-background/80 p-3 shadow-sm">
                        <p className="text-xs font-semibold text-primary">Inputs</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs sm:text-sm">
                          <li>Rule (e.g. FRE 403, 404(b), 901)</li>
                          <li>Short fact pattern</li>
                          <li>Jurisdiction / circuit</li>
                        </ul>
                      </div>
                    </div>

                    <div className="flex items-center justify-center">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/40 bg-primary/10 text-lg">
                        →
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl border bg-background/80 p-3 shadow-sm">
                        <p className="text-xs font-semibold text-primary">Outputs</p>
                        <ul className="mt-1 list-disc space-y-1 pl-4 text-xs sm:text-sm">
                          <li>Primary case: quote + pin cite</li>
                          <li>1–2 backup cases in the same circuit</li>
                          <li>Short explanation of fit</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 px-3 py-2 text-xs sm:text-sm text-primary">
                    <span className="font-semibold">Rule + Facts + Jurisdiction</span>
                    <span className="mx-1">→</span>
                    <span className="font-semibold">Quote + Pin Cite + Backup Cases</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-4">Why This Gap Exists</h2>
              <div className="space-y-6 text-muted-foreground">
                <div className="space-y-4">
                  <p className="leading-relaxed">
                    This problem lives in an uncomfortable middle layer. Incumbents like Westlaw and Lexis are
                    built around a safe promise: present all relevant law and leave judgment to the lawyer.
                    Compressing research into a recommended paragraph risks being “wrong” in a way that creates
                    liability or the appearance of legal advice.
                  </p>
                  <p className="leading-relaxed">
                    At the same time, the task is too domain-specific for generic AI tools. Systems that don’t
                    enforce jurisdictional hierarchy, precedential weight, or citation discipline can summarize
                    law, but they can’t reliably support courtroom use. LLM-first products like Harvey synthesize
                    answers atop probabilistic models, implicitly asking lawyers to trust generated reasoning
                    rather than traceable authority.
                  </p>
                </div>

                <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-6">
                  <p className="mb-3 text-xs font-medium tracking-wide text-primary uppercase">
                    Where Matlock Lives
                  </p>

                  <div className="relative mx-auto max-w-3xl">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-primary">Incumbent research</p>
                        <p className="mt-2 text-sm leading-relaxed">
                          Westlaw / Lexis optimize for completeness and recall — “show me everything,” then leave
                          judgment to the lawyer.
                        </p>
                      </div>
                      <div className="rounded-xl border bg-background/80 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-primary">Generic / LLM-first AI</p>
                        <p className="mt-2 text-sm leading-relaxed">
                          Fast summaries, but often missing hierarchy, precedential weight, and citation
                          discipline needed for courtroom use.
                        </p>
                      </div>
                    </div>

                    {/* Converging arrows → Matlock */}
                    <div className="relative mt-5">
                      <div className="grid items-center gap-3 md:grid-cols-[1fr_auto_1fr]">
                        <div className="hidden md:block" />
                        <div className="flex items-center justify-center text-primary">
                          <div className="h-px w-20 bg-primary/30" />
                          <div className="mx-2 text-lg leading-none">↘</div>
                          <div className="mx-2 text-lg leading-none">↙</div>
                          <div className="h-px w-20 bg-primary/30" />
                        </div>
                        <div className="hidden md:block" />
                      </div>

                      <div className="mt-3 rounded-2xl border border-primary/40 bg-primary/10 p-4 shadow-sm">
                        <p className="text-xs font-semibold text-primary">Matlock</p>
                        <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                          Exact quotes, defensible citations, and transparent sourcing — powered by semantic
                          understanding of fact patterns <span className="text-muted-foreground">and</span>{" "}
                          rigorous legal citation discipline.
                        </p>
                      </div>
                    </div>

                  </div>

                  <div className="mt-4 rounded-xl border border-dashed border-primary/40 bg-primary/5 p-3">
                    <p className="text-sm leading-relaxed text-primary">
                      What legal users actually need—especially under time pressure—are exact quotes, defensible
                      citations, and transparent sourcing. That middle layer is hard to build—but it’s exactly
                      where Matlock lives.
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <h2 className="text-2xl font-semibold mb-4">Why Exa, and Why This Market</h2>
              <div className="space-y-4 text-muted-foreground">
                <p className="leading-relaxed">
                  The core signals here aren’t documents, but structure: semantic similarity between fact
                  patterns, recurring judicial reasoning, and the specific paragraphs courts rely on when
                  applying evidentiary rules. Exa is uniquely positioned to capture these signals through
                  semantic retrieval and content extraction across high-quality public legal corpora.
                </p>

                <p className="leading-relaxed">
                  This enables a workflow that moves directly from fact pattern to objection-ready authority,
                  unlocking a market of litigation teams who repeatedly face high-stakes evidentiary questions
                  under severe time constraints [STAT: size of litigation services market / number of active
                  litigators in U.S. courts].
                </p>

                <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 sm:p-6">
                  <p className="text-sm font-medium text-foreground">
                    More broadly, this is a compelling market for Exa because:
                  </p>
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed">
                    <li>the underlying corpus is public, open, and high-quality</li>
                    <li>keyword search performs poorly relative to semantic understanding</li>
                    <li>success is clearly defined (“can I use this in court?”)</li>
                    <li>trust compounds quickly, enabling expansion from mid-law to Big Law</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6 sm:p-8">
              <p className="text-base sm:text-lg leading-relaxed text-foreground">
                <span className="font-semibold text-primary">Matlock</span> doesn’t replace legal databases; it
                compresses them into something usable. This is a domain where finding the{" "}
                <span className="italic">right</span> paragraph matters more than finding every document, and
                that’s exactly where Exa’s ground-up approach to search shines. If knowledge is power, then justice depends on the ability to surface and apply it precisely, transparently, and at the
                  moment it matters most.
              </p>
            </Card>
          </div>
        </div>
      </main>
    </>
  )
}
