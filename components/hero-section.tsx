"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { HeroHeader } from "@/components/header"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"

const RULE_OPTIONS = [
    { value: "fre_403", label: "Rule 403 — Probative Value vs Unfair Prejudice" },
    { value: "fre_404b", label: "Rule 404(b) — Prior Bad Acts" },
    // future:
    // { value: "fre_901", label: "Rule 901 — Authentication" },
    // { value: "fre_801", label: "Rule 801–807 — Hearsay" },
  ];

  const JURISDICTION_OPTIONS = [
    { value: "us_federal", label: "United States — Federal Courts" },
    // future:
    // { value: "us_9th_circuit", label: "Ninth Circuit" },
    // { value: "us_sdny", label: "Southern District of New York" },
  ];
  

export default function HeroSection() {
  const [query, setQuery] = React.useState("")
  const [rule, setRule] = React.useState(RULE_OPTIONS[0]!.value)
  const [jurisdiction, setJurisdiction] = React.useState(
    JURISDICTION_OPTIONS[0]!.value
  )

  const [toggles, setToggles] = React.useState({
    bindingAuthority: true,
    bePersuasive: true,
    onlyPublished: false,
    timeWindow: false,
  })

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    // UI-only for now; hook this up to your search flow when ready.
    // eslint-disable-next-line no-console
    console.log({ query, rule, jurisdiction, toggles })
  }

  return (
    <>
    <HeroHeader />
    <main className="min-h-[100svh] px-6 py-14 sm:py-52">
      <div className="mx-auto w-full max-w-4xl">
        <div className="flex flex-col items-center gap-6 sm:gap-8">
        

          <Card className="w-full p-5 sm:p-6">
            <form onSubmit={onSubmit} className="space-y-4 sm:space-y-5">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:gap-0">
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search…"
                  className="h-11 sm:rounded-r-none"
                />
                <Button
                  type="submit"
                  className="h-11 sm:rounded-l-none"
                >
                  Find Cases
                </Button>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Rule</Label>
                  <Select value={rule} onValueChange={setRule}>
                    <SelectTrigger className="h-11">
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
                </div>

                <div className="space-y-2">
                  <Label>Jurisdiction</Label>
                  <Select
                    value={jurisdiction}
                    onValueChange={setJurisdiction}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Select a jurisdiction" />
                    </SelectTrigger>
                    <SelectContent>
                      {JURISDICTION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Toggles</Label>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 w-full justify-between"
                      >
                        Options
                        <ChevronDown className="text-muted-foreground size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-72">
                      <DropdownMenuLabel>Filters</DropdownMenuLabel>
                      <DropdownMenuSeparator />

                      <div className="space-y-3 px-2 py-2">
                        <div className="flex items-center justify-between gap-3">
                          <Label htmlFor="toggle-cases" className="font-normal">
                            Prefer binding authority precedent
                          </Label>
                          <Switch
                            id="toggle-cases"
                            checked={toggles.bindingAuthority}
                            onCheckedChange={(checked) =>
                              setToggles((t) => ({ ...t, bindingAuthority: checked }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor="toggle-statutes"
                            className="font-normal"
                          >
                            Include persuasive cases
                          </Label>
                          <Switch
                            id="toggle-statutes"
                            checked={toggles.bePersuasive}
                            onCheckedChange={(checked) =>
                              setToggles((t) => ({
                                ...t,
                                bePersuasive: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor="toggle-secondary"
                            className="font-normal"
                          >
                            Show only published opinions
                          </Label>
                          <Switch
                            id="toggle-secondary"
                            checked={toggles.onlyPublished}
                            onCheckedChange={(checked) =>
                              setToggles((t) => ({
                                ...t,
                                onlyPublished: checked,
                              }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between gap-3">
                          <Label
                            htmlFor="toggle-published"
                            className="font-normal"
                          >
                            Time window
                          </Label>
                          <Switch
                            id="toggle-published"
                            checked={toggles.timeWindow}
                            onCheckedChange={(checked) =>
                              setToggles((t) => ({
                                ...t,
                                timeWindow: checked,
                              }))
                            }
                          />
                        </div>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </form>
          </Card>
        </div>
      </div>
    </main>
    </>
  )
}
