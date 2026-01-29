"use client"

import * as React from "react"

type Props = {
  phrases: string[]
  className?: string
  typeMs?: number
  deleteMs?: number
  pauseMs?: number
}

export function TypewriterHeadline({
  phrases,
  className,
  typeMs = 28,
  deleteMs = 16,
  pauseMs = 1000,
}: Props) {
  const safePhrases = phrases.length ? phrases : [""]

  const [phraseIndex, setPhraseIndex] = React.useState(0)
  const [text, setText] = React.useState("")
  const [mode, setMode] = React.useState<"typing" | "pausing" | "deleting">(
    "typing"
  )

  React.useEffect(() => {
    const full = safePhrases[phraseIndex] ?? ""

    if (mode === "typing") {
      if (text === full) {
        const t = window.setTimeout(() => setMode("pausing"), pauseMs)
        return () => window.clearTimeout(t)
      }
      const t = window.setTimeout(() => {
        setText(full.slice(0, text.length + 1))
      }, typeMs)
      return () => window.clearTimeout(t)
    }

    if (mode === "pausing") {
      const t = window.setTimeout(() => setMode("deleting"), pauseMs)
      return () => window.clearTimeout(t)
    }

    // deleting
    if (text.length === 0) {
      setMode("typing")
      setPhraseIndex((i) => (i + 1) % safePhrases.length)
      return
    }
    const t = window.setTimeout(() => {
      setText((s) => s.slice(0, -1))
    }, deleteMs)
    return () => window.clearTimeout(t)
  }, [deleteMs, mode, pauseMs, phraseIndex, safePhrases, text, typeMs])

  return (
    <span className={className}>
      {text}
      <span className="sr-only">
        {safePhrases.join(". ")}
      </span>
    </span>
  )
}

