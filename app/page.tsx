"use client"

import * as React from "react"

import { HeroHeader } from "@/components/header"
import { FindCasesForm } from "@/components/FindCasesForm"
import { ResultsPanel } from "@/components/ResultsPanel"
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
        <div className="mx-auto w-full max-w-5xl">
          <div className="flex flex-col items-center gap-6 sm:gap-8">
            <div className="text-center">
              <div className="text-muted-foreground text-sm font-medium tracking-wide">
                Matlock
              </div>
              <h1 className="mt-2 text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                Find the best cases for your evidence motion
              </h1>
              <p className="text-muted-foreground mt-3 max-w-2xl text-balance text-sm sm:text-base">
                Start with the rule + jurisdiction and a short fact pattern. We’ll generate a best-fit case plus two backups with quotable snippets.
              </p>
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
