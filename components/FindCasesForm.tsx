"use client"

import * as React from "react"

import type { SearchForm } from "@/lib/searchCases"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const RULE_OPTIONS = [
  { value: "FRE 401", label: "FRE 401 — Relevance" },
  { value: "FRE 402", label: "FRE 402 — General Admissibility" },
  { value: "FRE 403", label: "FRE 403 — Probative Value vs Unfair Prejudice" },
  { value: "FRE 404(b)", label: "FRE 404(b) — Prior Bad Acts" },
  { value: "FRE 801–807", label: "FRE 801–807 — Hearsay" },
  { value: "FRE 702", label: "FRE 702 — Daubert" },
] as const

const COURT_OPTIONS = [
  { value: "ca9", label: "Federal – 9th Cir" },
  { value: "cand", label: "N.D. Cal" },
  { value: "nysd", label: "S.D.N.Y." },
] as const

const TIME_WINDOWS = [3, 5, 10, 15, 20] as const

type FormErrors = Partial<Record<keyof SearchForm, string>>

export function FindCasesForm({
  initialValue,
  loading,
  onSearch,
}: {
  initialValue?: Partial<SearchForm>
  loading?: boolean
  onSearch: (form: SearchForm) => Promise<void> | void
}) {
  const [form, setForm] = React.useState<SearchForm>({
    rule: initialValue?.rule ?? "",
    courtId: initialValue?.courtId ?? "",
    factPattern: initialValue?.factPattern ?? "",
    preferBinding: initialValue?.preferBinding ?? true,
    includePersuasive: initialValue?.includePersuasive ?? true,
    onlyPublished: initialValue?.onlyPublished ?? false,
    timeWindowYears: initialValue?.timeWindowYears ?? 10,
  })
  const [errors, setErrors] = React.useState<FormErrors>({})

  function validate(next: SearchForm): FormErrors {
    const e: FormErrors = {}
    if (!next.rule) e.rule = "Select a rule."
    if (!next.courtId) e.courtId = "Select a jurisdiction."
    if (!next.factPattern || next.factPattern.trim().length < 20)
      e.factPattern = "Add a short fact pattern (at least ~20 characters)."
    return e
  }

  async function onSubmit(ev: React.FormEvent) {
    ev.preventDefault()
    const e = validate(form)
    setErrors(e)
    if (Object.keys(e).length > 0) return
    await onSearch(form)
  }

  return (
    <section className="mt-8" aria-label="Find cases form">
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl sm:text-2xl">Evidence Motion Helper</CardTitle>
          <div className="text-muted-foreground text-sm">
            Describe your evidence issue, then get the best-fit case + backup authorities.
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rule">Rule</Label>
                <Select
                  value={form.rule}
                  onValueChange={(v) => setForm((f) => ({ ...f, rule: v }))}
                >
                  <SelectTrigger id="rule" className="h-10">
                    <SelectValue placeholder="Select a rule" />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.rule ? (
                  <div className="text-destructive text-xs">{errors.rule}</div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="courtId">Jurisdiction</Label>
                <Select
                  value={form.courtId}
                  onValueChange={(v) => setForm((f) => ({ ...f, courtId: v }))}
                >
                  <SelectTrigger id="courtId" className="h-10">
                    <SelectValue placeholder="Select a court" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.courtId ? (
                  <div className="text-destructive text-xs">{errors.courtId}</div>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="factPattern">Fact pattern</Label>
              <Textarea
                id="factPattern"
                value={form.factPattern}
                onChange={(e) => setForm((f) => ({ ...f, factPattern: e.target.value }))}
                placeholder="2–8 sentences. What’s the evidence, what’s disputed, and why is it prejudicial / unreliable / confusing?"
              />
              <div className="text-muted-foreground text-xs">
                Tip: include what the other side will argue, and whether you offered a stipulation.
              </div>
              {errors.factPattern ? (
                <div className="text-destructive text-xs">{errors.factPattern}</div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Prefer binding authority</div>
                    <div className="text-muted-foreground text-xs">
                      Prioritize cases that bind your court.
                    </div>
                  </div>
                  <Switch
                    checked={form.preferBinding}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, preferBinding: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Include persuasive cases</div>
                    <div className="text-muted-foreground text-xs">
                      Add helpful non-binding authorities.
                    </div>
                  </div>
                  <Switch
                    checked={form.includePersuasive}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, includePersuasive: checked }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Show only published opinions</div>
                    <div className="text-muted-foreground text-xs">
                      Exclude unpublished dispositions when possible.
                    </div>
                  </div>
                  <Switch
                    checked={form.onlyPublished}
                    onCheckedChange={(checked) =>
                      setForm((f) => ({ ...f, onlyPublished: checked }))
                    }
                  />
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <Label className="text-sm font-medium" htmlFor="timeWindowYears">
                    Time window (last N years)
                  </Label>
                  <div className="flex items-center gap-2">
                    <Select
                      value={String(form.timeWindowYears)}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, timeWindowYears: Number(v) }))
                      }
                    >
                      <SelectTrigger id="timeWindowYears" className="h-10">
                        <SelectValue placeholder="Select years" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIME_WINDOWS.map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <div className="flex-1">
                      <Input
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={String(form.timeWindowYears)}
                        onChange={(e) => {
                          const next = Number(e.target.value || 0)
                          setForm((f) => ({ ...f, timeWindowYears: Number.isFinite(next) ? next : f.timeWindowYears }))
                        }}
                        className="h-10"
                        aria-label="Time window years"
                      />
                    </div>
                  </div>
                  <div className="text-muted-foreground text-xs">
                    Default is 10 years.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
              <Button type="submit" className="h-10 w-full sm:w-auto" disabled={loading}>
                {loading ? "Searching…" : "Find best cases"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}

