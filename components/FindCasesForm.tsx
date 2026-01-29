"use client"

import * as React from "react"

import type { SearchForm } from "@/lib/searchCases"
import { Button } from "@/components/ui/button"
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

const TIME_WINDOWS = [
  { value: 1000, label: "Any" },
  { value: 10, label: "Last 10 years" },
  { value: 5, label: "Last 5 years" },
  { value: 3, label: "Last 3 years" },
  { value: 20, label: "Last 20 years" },
] as const

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

  function onFactKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      void onSubmit(e as unknown as React.FormEvent)
    }
  }

  return (
    <section className="mt-10" aria-label="Find cases">
      <form onSubmit={onSubmit} className="space-y-6">
        <div className="mx-auto w-full max-w-3xl rounded-2xl border bg-background/60 p-4 shadow-sm backdrop-blur sm:p-6">
          <div className="flex items-center justify-center">
            <div className="rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Matlock</span>
            </div>
          </div>

          <div className="mt-4">
            <Textarea
              id="factPattern"
              value={form.factPattern}
              onChange={(e) => setForm((f) => ({ ...f, factPattern: e.target.value }))}
              onKeyDown={onFactKeyDown}
              placeholder="Describe the evidence issue…"
              className="min-h-[140px] rounded-2xl border-border/70 bg-background/80 px-5 py-4 text-base leading-relaxed shadow-none focus-visible:ring-ring/40 focus-visible:ring-[3px] sm:min-h-[160px] sm:text-lg"
            />

            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-xs">
                Tip: include what the other side will argue.{" "}
                <span className="hidden sm:inline">Cmd/Ctrl+Enter to search.</span>
              </p>
              <Button type="submit" className="h-10 rounded-xl px-5" disabled={loading}>
                {loading ? "Searching…" : "Search"}
              </Button>
            </div>

            {errors.factPattern ? (
              <div className="text-destructive mt-2 text-xs">{errors.factPattern}</div>
            ) : null}
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border bg-background/60 p-4 shadow-sm backdrop-blur">
              <Label htmlFor="rule" className="text-muted-foreground text-xs">
                Rule
              </Label>
              <div className="mt-2">
                <Select value={form.rule} onValueChange={(v) => setForm((f) => ({ ...f, rule: v }))}>
                  <SelectTrigger id="rule" className="h-11 rounded-xl border-border/70 bg-background/80">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {RULE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.rule ? <div className="text-destructive mt-2 text-xs">{errors.rule}</div> : null}
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 p-4 shadow-sm backdrop-blur">
              <Label htmlFor="courtId" className="text-muted-foreground text-xs">
                Jurisdiction
              </Label>
              <div className="mt-2">
                <Select value={form.courtId} onValueChange={(v) => setForm((f) => ({ ...f, courtId: v }))}>
                  <SelectTrigger id="courtId" className="h-11 rounded-xl border-border/70 bg-background/80">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {COURT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.courtId ? <div className="text-destructive mt-2 text-xs">{errors.courtId}</div> : null}
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 p-4 shadow-sm backdrop-blur">
              <Label htmlFor="timeWindowYears" className="text-muted-foreground text-xs">
                Time Window
              </Label>
              <div className="mt-2">
                <Select
                  value={String(form.timeWindowYears)}
                  onValueChange={(v) => setForm((f) => ({ ...f, timeWindowYears: Number(v) }))}
                >
                  <SelectTrigger id="timeWindowYears" className="h-11 rounded-xl border-border/70 bg-background/80">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_WINDOWS.map((opt) => (
                      <SelectItem key={opt.value} value={String(opt.value)}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-2xl border bg-background/60 p-4 shadow-sm backdrop-blur">
              <p className="text-muted-foreground text-xs">Include</p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                  <p className="text-sm font-medium text-foreground">Prefer precedential</p>
                  <Switch
                    checked={form.preferBinding}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, preferBinding: checked }))}
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/80 px-3 py-2">
                  <p className="text-sm font-medium text-foreground">Include persuasive</p>
                  <Switch
                    checked={form.includePersuasive}
                    onCheckedChange={(checked) => setForm((f) => ({ ...f, includePersuasive: checked }))}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-3 flex justify-center">
            <div className="rounded-full border bg-background/70 px-3 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
              Rule + facts → the paragraph courts cite
            </div>
          </div>
        </div>
      </form>
    </section>
  )
}

