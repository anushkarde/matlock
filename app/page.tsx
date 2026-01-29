"use client"

import * as React from "react"

import { HeroHeader } from "@/components/header"
import { FindCasesForm } from "@/components/FindCasesForm"
import { ResultsPanel } from "@/components/ResultsPanel"
import { TypewriterHeadline } from "@/components/TypewriterHeadline"
import type { SearchForm, SearchResults } from "@/lib/searchCases"
import { searchCases } from "@/lib/searchCases"

export default function Home() {
  const formRef = React.useRef<HTMLDivElement | null>(null)

  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<SearchResults | null>(null)
  const [lastForm, setLastForm] = React.useState<SearchForm | null>(null)

  async function onSearch(form: SearchForm) {
    setLastForm(form)
    setLoading(true)
    try {
      const r = await searchCases(form)
      setResults(r)
      requestAnimationFrame(() => {
        document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" })
      })
    } finally {
      setLoading(false)
    }
  }

  function onClear() {
    setResults(null)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }

  return (
    <>
      <HeroHeader />
      <main className="min-h-[100svh] px-6 py-14 sm:py-20">
        <div className="relative mx-auto w-full max-w-5xl">
          {/* Subtle hero backdrop (static) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 -top-10 -z-10 mx-auto h-72 max-w-5xl"
          >
            <div className="absolute inset-0 [background-image:linear-gradient(to_bottom,transparent_98%,theme(colors.border/60)_98%),linear-gradient(to_right,transparent_94%,_theme(colors.border/60)_94%)] [background-size:16px_34px] [mask:radial-gradient(black,transparent_70%)] opacity-60" />
            <div className="absolute left-1/2 top-10 h-40 w-2/3 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          </div>

          <div className="flex flex-col items-center gap-6 sm:gap-8">
            <div className="text-center">
              <h1 className="mt-12 sm:mt-16 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                <TypewriterHeadline
                  phrases={[
                    "Find the best cases for your evidence motion",
                    "Get objection-ready quotes in seconds",
                    "Rule + facts → the paragraph courts cite",
                  ]}
                />
              </h1>
            </div>
          </div>

          <div ref={formRef}>
            <FindCasesForm
              initialValue={
                lastForm ?? {
                  rule: "FRE 403",
                  courtId: "ca9",
                  timeWindowYears: 10,
                  preferBinding: true,
                  includePersuasive: true,
                  onlyPublished: false,
                }
              }
              loading={loading}
              onSearch={onSearch}
            />
          </div>

          {results ? (
            <div id="results">
              <ResultsPanel results={results} onClear={onClear} />
            </div>
          ) : null}
        </div>
      </main>
    </>
  )
}
