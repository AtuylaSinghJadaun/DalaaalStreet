'use client'

import { useState } from 'react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { ENDGAME_ROUND_NUMBER } from '@/store/useGlobalStore'
import { toast } from 'sonner'
import {
  Users, Building2, TrendingUp, BarChart3, DollarSign,
  CheckCircle2, Plus, Trash2, ChevronRight
} from 'lucide-react'

const STEPS = [
  { id: 1, title: 'Teams',      description: 'Set up participating teams',         icon: Users },
  { id: 2, title: 'Companies',  description: 'List companies for trading',          icon: Building2 },
  { id: 3, title: 'IPO Prices', description: 'Set IPO mean prices & min spend',    icon: TrendingUp },
  { id: 4, title: 'Rounds',     description: 'Define rounds & per-round prices',   icon: BarChart3 },
  { id: 5, title: 'End Prices', description: 'Set final settlement prices',         icon: DollarSign },
  { id: 6, title: 'Launch',     description: 'Review and launch the competition',  icon: CheckCircle2 },
]

interface SavedCompany { id: string; name: string }

interface RoundDraft {
  round_number: number
  title: string
  event_description: string
  prices: Record<string, number>   // companyId → price
}

export default function SetupWizard() {
  const [step, setStep]           = useState(1)
  const [isLoading, setIsLoading] = useState(false)

  // Step 1
  const [teamCount, setTeamCount]         = useState(10)
  const [initialBalance, setInitialBalance] = useState(1000000)

  // Step 2
  const [companyNames, setCompanyNames]   = useState<string[]>(['', ''])
  const [savedCompanies, setSavedCompanies] = useState<SavedCompany[]>([])

  // Step 3 — IPO mean prices
  const [ipoMinSpend, setIpoMinSpend]     = useState(100000)
  const [ipoPrices, setIpoPrices]         = useState<Record<string, number>>({})   // id → mean price

  // Step 4 — Rounds
  const [rounds, setRounds] = useState<RoundDraft[]>([
    { round_number: 1, title: 'Round 1', event_description: '', prices: {} },
    { round_number: 2, title: 'Round 2', event_description: '', prices: {} },
    { round_number: 3, title: 'Round 3', event_description: '', prices: {} },
  ])

  // Step 5 — End prices
  const [endPrices, setEndPrices] = useState<Record<string, number>>({})

  // ── helpers ──────────────────────────────────────────────────
  const seedPricesForCompanies = (companies: SavedCompany[]) => {
    const ipoBlanks: Record<string, number> = {}
    const endBlanks: Record<string, number> = {}
    companies.forEach(c => {
      ipoBlanks[c.id] = 100
      endBlanks[c.id] = 100
    })
    setIpoPrices(ipoBlanks)
    setEndPrices(endBlanks)
    setRounds(prev => prev.map(r => ({
      ...r,
      prices: Object.fromEntries(companies.map(c => [c.id, 100]))
    })))
  }

  // ── STEP 1: Create teams ──────────────────────────────────────
  const handleCreateTeams = async () => {
    if (teamCount < 1 || teamCount > 200) {
      toast.error('Team count must be between 1 and 200')
      return
    }
    setIsLoading(true)
    try {
      await supabase.from('global_state').update({
        initial_team_balance: initialBalance,
        ipo_min_spend: ipoMinSpend,
      }).eq('id', 1)

      const newTeams = Array.from({ length: teamCount }).map((_, i) => ({
        team_number: i + 1,
        team_code: Math.floor(100000 + Math.random() * 900000).toString(),
        name: `Team ${i + 1}`,
        cash_balance: initialBalance,
        ipo_participant: false,
        locked: false,
      }))

      const { error } = await supabase.from('teams').insert(newTeams)
      if (error) throw error

      toast.success(`${teamCount} teams created!`)
      setStep(2)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── STEP 2: Save companies ────────────────────────────────────
  const handleSaveCompanies = async () => {
    const valid = companyNames.map(n => n.trim()).filter(Boolean)
    if (valid.length === 0) {
      toast.error('Add at least one company')
      return
    }
    setIsLoading(true)
    try {
      const { data, error } = await supabase
        .from('companies')
        .insert(valid.map(name => ({
          name,
          description: '',
          industry: 'General',
          ipo_price: 0,          // will be set in step 3
          available_shares: 10000,
          initial_valuation: 0,
          end_price: 0,
        })))
        .select()
      if (error) throw error

      const saved: SavedCompany[] = data.map((d: any) => ({ id: d.id, name: d.name }))
      setSavedCompanies(saved)
      seedPricesForCompanies(saved)
      toast.success('Companies saved!')
      setStep(3)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── STEP 3: Save IPO settings ─────────────────────────────────
  const handleSaveIpo = async () => {
    setIsLoading(true)
    try {
      // update global_state
      await supabase.from('global_state').update({ ipo_min_spend: ipoMinSpend }).eq('id', 1)

      // write ipo_price (mean) into each company
      for (const c of savedCompanies) {
        const price = ipoPrices[c.id] ?? 100
        const { error } = await supabase.from('companies').update({ ipo_price: price }).eq('id', c.id)
        if (error) throw error
      }
      toast.success('IPO settings saved!')
      setStep(4)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── STEP 4: Save rounds ───────────────────────────────────────
  const handleSaveRounds = async () => {
    const valid = rounds.filter(r => r.title.trim())
    if (valid.length === 0) { toast.error('Add at least one round'); return }
    setIsLoading(true)
    try {
      const { data: insertedRounds, error: roundErr } = await supabase
        .from('rounds')
        .insert(valid.map(r => ({
          round_number: r.round_number,
          title: r.title.trim(),
          event_description: r.event_description || '',
          is_active: false,
        })))
        .select()
      if (roundErr) throw roundErr

      // insert round_prices for each round × company
      const roundPriceRows: any[] = []
      insertedRounds.forEach((ir: any, idx: number) => {
        const draft = valid[idx]
        savedCompanies.forEach(c => {
          roundPriceRows.push({
            round_id: ir.id,
            company_id: c.id,
            mean_price: draft.prices[c.id] ?? 100,
          })
        })
      })
      const { error: priceErr } = await supabase.from('round_prices').insert(roundPriceRows)
      if (priceErr) throw priceErr

      toast.success('Rounds & prices saved!')
      setStep(5)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── STEP 5: Save end prices ───────────────────────────────────
  // End prices live in a dedicated "Endgame" round (round_number = 9999), the
  // same place the game-end liquidation and final graphs read from. This keeps
  // the schema consistent: IPO (company.ipo_price) → rounds → Endgame round.
  const handleSaveEndPrices = async () => {
    setIsLoading(true)
    try {
      // Find or create the Endgame round (idempotent if the step is re-run).
      let endgameId: string
      const { data: existing } = await supabase
        .from('rounds')
        .select('id')
        .eq('round_number', ENDGAME_ROUND_NUMBER)
        .maybeSingle()

      if (existing) {
        endgameId = existing.id
        await supabase.from('round_prices').delete().eq('round_id', endgameId)
      } else {
        const { data: created, error: rErr } = await supabase
          .from('rounds')
          .insert({
            round_number: ENDGAME_ROUND_NUMBER,
            title: 'Endgame',
            event_description: 'Final liquidation prices used when the game ends.',
            is_active: false,
          })
          .select()
          .single()
        if (rErr || !created) throw rErr || new Error('Failed to create Endgame round')
        endgameId = created.id
      }

      const rows = savedCompanies.map(c => ({
        round_id: endgameId,
        company_id: c.id,
        mean_price: endPrices[c.id] ?? 0,
      }))
      const { error: pErr } = await supabase.from('round_prices').insert(rows)
      if (pErr) throw pErr

      toast.success('End prices saved!')
      setStep(6)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── STEP 6: Launch ────────────────────────────────────────────
  const handleLaunch = async () => {
    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('global_state')
        .update({ current_phase: 'waiting_for_ipo' })
        .eq('id', 1)
      if (error) throw error
      toast.success('Competition launched! 🚀')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background text-foreground p-6 flex flex-col items-center">
      {/* Header */}
      <div className="w-full max-w-3xl mb-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-1">Competition Setup</h1>
        <p className="text-muted-foreground">Complete all steps to launch DalaaalStreet</p>
      </div>

      {/* Step progress */}
      <div className="w-full max-w-3xl mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = step === s.id
            const isDone   = step > s.id
            return (
              <div key={s.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                    isDone   ? 'bg-primary border-primary text-primary-foreground' :
                    isActive ? 'border-primary text-primary bg-primary/10' :
                               'border-muted-foreground/30 text-muted-foreground'
                  }`}>
                    {isDone ? <CheckCircle2 className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${isActive || isDone ? 'text-primary' : 'text-muted-foreground'}`}>
                    {s.title}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 transition-all ${step > s.id ? 'bg-primary' : 'bg-muted-foreground/20'}`} />
                )}
              </div>
            )
          })}
        </div>
      </div>

      <Card className="w-full max-w-3xl bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            {(() => { const Icon = STEPS[step - 1].icon; return <Icon className="w-5 h-5 text-primary" /> })()}
            {STEPS[step - 1].title}
          </CardTitle>
          <CardDescription>{STEPS[step - 1].description}</CardDescription>
        </CardHeader>

        {/* ── STEP 1: TEAMS ──────────────────────────────────── */}
        {step === 1 && (
          <>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="teamCount">Number of Teams</Label>
                <Input id="teamCount" type="number" min={1} max={200}
                  value={teamCount || ''} onChange={e => setTeamCount(Number(e.target.value))}
                  className="bg-background" />
                <p className="text-xs text-muted-foreground">Each team gets a unique 6-digit login code automatically.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="initBal">Initial Balance per Team (₹)</Label>
                <Input id="initBal" type="number" min={1000}
                  value={initialBalance || ''} onChange={e => setInitialBalance(Number(e.target.value))}
                  className="bg-background" />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCreateTeams} disabled={isLoading} className="w-full">
                {isLoading ? 'Creating…' : `Create ${teamCount} Teams & Continue`}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {/* ── STEP 2: COMPANIES ──────────────────────────────── */}
        {step === 2 && (
          <>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">Enter the name of each company that will be listed for trading.</p>
              {companyNames.map((name, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm w-5 shrink-0">{i + 1}.</span>
                  <Input
                    value={name}
                    onChange={e => setCompanyNames(prev => prev.map((n, idx) => idx === i ? e.target.value : n))}
                    placeholder={`Company name`}
                    className="bg-background"
                  />
                  {companyNames.length > 1 && (
                    <Button variant="ghost" size="sm"
                      onClick={() => setCompanyNames(prev => prev.filter((_, idx) => idx !== i))}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
              <Button variant="outline" onClick={() => setCompanyNames(prev => [...prev, ''])}
                className="w-full border-dashed mt-2">
                <Plus className="w-4 h-4 mr-2" /> Add Company
              </Button>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveCompanies} disabled={isLoading} className="w-full">
                {isLoading ? 'Saving…' : 'Save Companies & Continue'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {/* ── STEP 3: IPO PRICES ─────────────────────────────── */}
        {step === 3 && (
          <>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="ipoMin">Minimum IPO Spend per Team (₹)</Label>
                <Input id="ipoMin" type="number" min={0}
                  value={ipoMinSpend || ''} onChange={e => setIpoMinSpend(Number(e.target.value))}
                  className="bg-background" />
                <p className="text-xs text-muted-foreground">Each team must spend at least this amount during the IPO phase. Set 0 for no minimum.</p>
              </div>

              <div className="space-y-3">
                <Label>IPO Mean Price per Company (₹)</Label>
                <p className="text-xs text-muted-foreground -mt-2">This is the base IPO price teams will see when purchasing shares.</p>
                {savedCompanies.map(c => (
                  <div key={c.id} className="flex items-center gap-4 border border-border rounded-lg p-3 bg-background/50">
                    <span className="flex-1 font-medium text-sm">{c.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">₹</span>
                      <Input
                        type="number" min={1}
                        className="w-28 bg-background"
                        value={ipoPrices[c.id] || ''}
                        onChange={e => setIpoPrices(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                      />
                      <span className="text-xs text-muted-foreground">/ share</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveIpo} disabled={isLoading} className="w-full">
                {isLoading ? 'Saving…' : 'Save IPO Settings & Continue'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {/* ── STEP 4: ROUNDS ─────────────────────────────────── */}
        {step === 4 && (
          <>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Define each trading round. Set the news headline that participants will see, and the mean price of each stock in that round.
              </p>
              {rounds.map((r, i) => (
                <div key={i} className="border border-border rounded-lg p-4 space-y-3 bg-background/50">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-primary">Round {r.round_number}</span>
                    {rounds.length > 1 && (
                      <Button variant="ghost" size="sm" onClick={() =>
                        setRounds(prev => prev
                          .filter((_, idx) => idx !== i)
                          .map((rr, idx) => ({ ...rr, round_number: idx + 1, title: `Round ${idx + 1}` }))
                        )}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>

                  {/* Event description */}
                  <div className="space-y-1">
                    <Label className="text-xs">News / Event (shown to participants)</Label>
                    <Input
                      value={r.event_description}
                      onChange={e => setRounds(prev => prev.map((rr, idx) =>
                        idx === i ? { ...rr, event_description: e.target.value } : rr))}
                      placeholder="e.g. RBI hikes rates — banking stocks fall"
                      className="bg-background"
                    />
                  </div>

                  {/* Per-company prices */}
                  <div className="space-y-2">
                    <Label className="text-xs">Mean Stock Price in this Round (₹)</Label>
                    <div className="space-y-2">
                      {savedCompanies.map(c => (
                        <div key={c.id} className="flex items-center gap-3">
                          <span className="flex-1 text-sm text-muted-foreground">{c.name}</span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">₹</span>
                            <Input
                              type="number" min={1}
                              className="w-24 bg-background text-sm h-8"
                              value={r.prices[c.id] || ''}
                              onChange={e => setRounds(prev => prev.map((rr, idx) =>
                                idx === i ? { ...rr, prices: { ...rr.prices, [c.id]: Number(e.target.value) } } : rr
                              ))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={() => setRounds(prev => [
                ...prev,
                {
                  round_number: prev.length + 1,
                  title: `Round ${prev.length + 1}`,
                  event_description: '',
                  prices: Object.fromEntries(savedCompanies.map(c => [c.id, 100]))
                }
              ])} className="w-full border-dashed">
                <Plus className="w-4 h-4 mr-2" /> Add Another Round
              </Button>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveRounds} disabled={isLoading} className="w-full">
                {isLoading ? 'Saving…' : 'Save Rounds & Continue'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {/* ── STEP 5: END PRICES ─────────────────────────────── */}
        {step === 5 && (
          <>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Set the final settlement price for each company. This is used to calculate each team's net worth at game end.
                <span className="block mt-1 text-primary font-medium">Hidden from participants until the game ends.</span>
              </p>
              {savedCompanies.map(c => (
                <div key={c.id} className="flex items-center gap-4 border border-border rounded-lg p-3 bg-background/50">
                  <div className="flex-1">
                    <p className="font-medium text-sm">{c.name}</p>
                    <p className="text-xs text-muted-foreground">IPO price: ₹{ipoPrices[c.id] ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">₹</span>
                    <Input
                      type="number" min={0}
                      className="w-28 bg-background"
                      value={endPrices[c.id] || ''}
                      onChange={e => setEndPrices(prev => ({ ...prev, [c.id]: Number(e.target.value) }))}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveEndPrices} disabled={isLoading} className="w-full">
                {isLoading ? 'Saving…' : 'Save End Prices & Continue'}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </CardFooter>
          </>
        )}

        {/* ── STEP 6: LAUNCH ─────────────────────────────────── */}
        {step === 6 && (
          <>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-5 space-y-4">
                <div className="flex items-center gap-2 text-primary font-semibold">
                  <CheckCircle2 className="w-5 h-5" />
                  All Setup Complete — Ready to Launch
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div><p className="text-muted-foreground">Teams</p><p className="font-semibold">{teamCount}</p></div>
                  <div><p className="text-muted-foreground">Companies</p><p className="font-semibold">{savedCompanies.length}</p></div>
                  <div><p className="text-muted-foreground">Rounds</p><p className="font-semibold">{rounds.length}</p></div>
                  <div><p className="text-muted-foreground">Initial Balance</p><p className="font-semibold">₹{initialBalance.toLocaleString()}</p></div>
                  <div><p className="text-muted-foreground">IPO Min Spend</p><p className="font-semibold">₹{ipoMinSpend.toLocaleString()}</p></div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Companies listed:</p>
                  <div className="flex flex-wrap gap-2">
                    {savedCompanies.map(c => (
                      <span key={c.id} className="text-xs bg-primary/10 text-primary rounded-full px-2 py-0.5">{c.name}</span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Launching moves participants to the "Waiting for IPO" lobby.
              </p>
            </CardContent>
            <CardFooter>
              <Button onClick={handleLaunch} disabled={isLoading} className="w-full" size="lg">
                {isLoading ? 'Launching…' : '🚀 Launch DalaaalStreet'}
              </Button>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  )
}
