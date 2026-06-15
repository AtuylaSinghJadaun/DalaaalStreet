'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useGlobalStore'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Users, Building2, TrendingUp, Power, ChevronRight, MonitorPlay } from 'lucide-react'
import { ENDGAME_ROUND_NUMBER } from '@/store/useGlobalStore'
import ResetDialog from './ResetDialog'

export default function MainDashboard() {
  const { globalState, teams, companies, rounds, holdings, roundPrices } = useAppStore()
  const [resetOpen, setResetOpen] = useState(false)

  // Playable rounds, excluding the Endgame sentinel.
  const playableRounds = rounds.filter(r => r.round_number !== ENDGAME_ROUND_NUMBER)
  const endgameRound = rounds.find(r => r.round_number === ENDGAME_ROUND_NUMBER)

  // When the game ends, liquidate every team's holdings into their cash balance.
  // Prefer the dedicated Endgame price set; fall back to the last played round.
  const liquidateHoldings = async () => {
    const lastPlayed = playableRounds.length
      ? playableRounds.reduce((a, b) => (a.round_number > b.round_number ? a : b))
      : undefined
    const finalRound = endgameRound || lastPlayed

    const finalPrice = (companyId: string) => {
      if (!finalRound) return 0
      const rp = roundPrices.find(p => p.round_id === finalRound.id && p.company_id === companyId)
      return rp ? rp.mean_price : 0
    }

    await Promise.all(
      teams.map(team => {
        const value = holdings
          .filter(h => h.team_id === team.id)
          .reduce((sum, h) => sum + h.quantity * finalPrice(h.company_id), 0)
        if (value <= 0) return Promise.resolve()
        return supabase
          .from('teams')
          .update({ cash_balance: team.cash_balance + value })
          .eq('id', team.id)
      })
    )
  }

  const handlePhaseChange = async (newPhase: string) => {
    if (newPhase === 'ended') {
      try {
        await liquidateHoldings()
      } catch (err: any) {
        toast.error('Failed to liquidate holdings: ' + err.message)
        return
      }
    }
    const { error } = await supabase.from('global_state').update({ current_phase: newPhase }).eq('id', 1)
    if (error) {
      toast.error('Failed to change phase: ' + error.message)
    } else {
      toast.success(`Phase changed to ${newPhase}`)
    }
  }

  const openMarketStage = () => {
    if (typeof window !== 'undefined') {
      window.open('/stage/market', 'dalaaal_market_stage', 'noopener')
    }
  }

  const currentPhase = globalState?.current_phase || 'setup'
  const activeTeamsCount = teams.filter(t => !t.locked).length
  const ipoParticipantsCount = teams.filter(t => t.ipo_participant).length

  const statCards = [
    { title: 'Active Teams', value: `${activeTeamsCount}/${teams.length}`, subtitle: `${ipoParticipantsCount} in IPO`, icon: Users },
    { title: 'Companies Listed', value: companies.length.toString(), subtitle: 'Trading assets', icon: Building2 },
    { title: 'Market Rounds', value: playableRounds.length.toString(), subtitle: 'Configured phases', icon: TrendingUp },
  ]

  // Build the phase progression dynamically from the configured rounds so the
  // controls always match however many rounds exist (no hardcoded count).
  const sortedRounds = [...playableRounds].sort((a, b) => a.round_number - b.round_number)
  const roundButtons = sortedRounds.map((round, index) => ({
    label: `Start Round ${round.round_number}`,
    phase: `round_${round.round_number}`,
    activePhase: index === 0 ? 'ipo' : `round_${sortedRounds[index - 1].round_number}`,
  }))
  const lastRoundPhase = sortedRounds.length
    ? `round_${sortedRounds[sortedRounds.length - 1].round_number}`
    : 'ipo'

  const phaseButtons = [
    { label: 'Release IPO', phase: 'ipo', activePhase: 'waiting_for_ipo' },
    ...roundButtons,
    { label: 'End Game', phase: 'ended', activePhase: lastRoundPhase },
    { label: 'Auction Phase', phase: 'auction', activePhase: 'ended' },
  ]

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Mentor Console</p>
          <h1 className="text-4xl font-bold tracking-tight text-white lg:text-5xl">
            Command Center
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="surface flex items-center gap-2.5 rounded-xl px-4 py-2.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary/70" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            <div className="leading-tight">
              <p className="text-[0.6rem] font-medium uppercase tracking-widest text-muted-foreground">Phase</p>
              <p className="font-display text-sm font-semibold uppercase tracking-wide text-white">
                {currentPhase.replace(/_/g, ' ')}
              </p>
            </div>
          </div>
          <button
            onClick={openMarketStage}
            className="surface surface-hover flex h-[2.85rem] items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:!border-primary/40 hover:text-primary"
          >
            <MonitorPlay className="h-4 w-4" />
            <span className="hidden sm:inline">Big Screen</span>
          </button>
          <button
            onClick={() => setResetOpen(true)}
            className="surface surface-hover flex h-[2.85rem] items-center gap-2 rounded-xl px-4 text-sm font-medium text-muted-foreground hover:!border-[#ff5470]/40 hover:text-[#ff8298]"
          >
            <Power className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.title} className="surface surface-hover rounded-2xl p-5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <p className="eyebrow">{card.title}</p>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="font-display mt-4 text-4xl font-bold tabular-nums tracking-tight text-white">
                {card.value}
              </p>
              <p className="mt-1.5 text-sm text-muted-foreground">{card.subtitle}</p>
            </div>
          )
        })}
      </div>

      {/* Game Controls — uniform phase progression, one accent for the next action */}
      <div className="surface rounded-2xl p-5 lg:p-6">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Game Controls</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">Advance the competition phase</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
          {phaseButtons.map((btn) => {
            const isActive = currentPhase === btn.phase
            const isNext = currentPhase === btn.activePhase
            const disabled = !isNext && !isActive
            return (
              <button
                key={btn.phase}
                onClick={() => handlePhaseChange(btn.phase)}
                disabled={disabled}
                className={`group flex items-center justify-center gap-1.5 rounded-xl border px-3 py-3 text-sm font-medium transition-all duration-200 ${
                  isNext
                    ? 'border-primary/50 bg-primary/15 text-primary hover:bg-primary/25 hover:shadow-glow active:scale-[0.98]'
                    : isActive
                    ? 'border-white/15 bg-white/[0.06] text-white'
                    : 'cursor-not-allowed border-transparent bg-white/[0.02] text-gray-600'
                }`}
              >
                {isActive && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                <span className="truncate">{btn.label}</span>
                {isNext && <ChevronRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />}
              </button>
            )
          })}
        </div>
      </div>

      <ResetDialog open={resetOpen} onClose={() => setResetOpen(false)} />
    </div>
  )
}
