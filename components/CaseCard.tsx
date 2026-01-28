"use client"

import * as React from "react"
import Link from "next/link"

import type { CaseResult, CaseSnippet } from "@/lib/searchCases"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

function authorityMeta(authority: CaseResult["authority"]) {
  switch (authority) {
    case "binding":
      return { label: "Binding", className: "bg-emerald-600 text-white border-transparent" }
    case "persuasive":
      return { label: "Persuasive", className: "bg-blue-600 text-white border-transparent" }
    case "district":
      return { label: "District court", className: "bg-purple-600 text-white border-transparent" }
    case "older":
      return { label: "Older", className: "bg-zinc-600 text-white border-transparent" }
  }
}

function HighlightedText({ text, highlight }: { text: string; highlight?: string }) {
  if (!highlight) return <span>{text}</span>

  const idx = text.indexOf(highlight)
  if (idx === -1) return <span>{text}</span>

  const before = text.slice(0, idx)
  const after = text.slice(idx + highlight.length)

  return (
    <span>
      {before}
      <mark className="bg-yellow-200/50 rounded px-1 py-0.5">
        {highlight}
      </mark>
      {after}
    </span>
  )
}

function pickBestSnippetForCopy(snippets: CaseSnippet[]) {
  return snippets.find((s) => s.highlight)?.highlight ?? snippets[0]?.text ?? ""
}

export function CaseCard({
  result,
  isPrimary = false,
}: {
  result: CaseResult
  isPrimary?: boolean
}) {
  const [copyStatus, setCopyStatus] = React.useState<string | null>(null)
  const authority = authorityMeta(result.authority)

  async function onCopy() {
    const textToCopy = pickBestSnippetForCopy(result.snippets)
    if (!textToCopy) return

    try {
      await navigator.clipboard.writeText(textToCopy)
      setCopyStatus("Copied!")
      window.setTimeout(() => setCopyStatus(null), 1200)
    } catch {
      setCopyStatus("Copy failed")
      window.setTimeout(() => setCopyStatus(null), 1200)
    }
  }

  return (
    <Card className={cn(isPrimary && "ring-1 ring-emerald-500/30")}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base sm:text-lg">
              {result.name} — {result.courtLabel} ({result.year})
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={authority.className}>{authority.label}</Badge>
              {result.issueTags.map((t) => (
                <Badge
                  key={t}
                  variant="outline"
                  className="text-muted-foreground"
                >
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {result.snippets.slice(0, 3).map((s, idx) => (
          <div key={`${result.id}-snip-${idx}`} className="space-y-2">
            <div className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              {s.label}
            </div>
            <div className="text-sm leading-relaxed">
              <HighlightedText text={s.text} highlight={s.highlight} />
            </div>
            {idx !== Math.min(result.snippets.length, 3) - 1 ? (
              <Separator />
            ) : null}
          </div>
        ))}
      </CardContent>

      <CardFooter className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground text-xs">
          {copyStatus ? <span className="text-foreground">{copyStatus}</span> : <span>&nbsp;</span>}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:justify-end">
          {result.url ? (
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <Link href={result.url} target="_blank" rel="noreferrer">
                Open opinion
              </Link>
            </Button>
          ) : null}
          <Button onClick={onCopy} className="w-full sm:w-auto">
            Copy quote
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}

