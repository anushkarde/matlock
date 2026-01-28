"use client"

import * as React from "react"
import Link from "next/link"

import type { SearchResults } from "@/lib/searchCases"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CaseCard } from "@/components/CaseCard"

export function ResultsPanel({
  results,
  onClear,
}: {
  results: SearchResults
  onClear: () => void
}) {
  const best = results.bestFit

  return (
    <section className="mt-10 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-semibold tracking-tight">Results</h2>
        <Button variant="ghost" size="sm" onClick={onClear} className="w-fit px-2">
          New search / Clear results
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg">
                Best fit: {best.name} ({best.courtLabel}, {best.year})
              </CardTitle>
              <div className="text-muted-foreground text-sm">
                Why it fits:
              </div>
            </div>

            {best.url ? (
              <Button asChild className="w-full sm:w-auto">
                <Link href={best.url} target="_blank" rel="noreferrer">
                  Open opinion
                </Link>
              </Button>
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed">
            {results.whyFits.slice(0, 4).map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {results.cases.map((c, idx) => (
          <CaseCard key={c.id} result={c} isPrimary={idx === 0} />
        ))}
      </div>
    </section>
  )
}

