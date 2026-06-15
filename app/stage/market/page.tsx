'use client'

import { useAppStore } from '@/store/useGlobalStore'
import StockChart from '@/components/StockChart'
import Confetti from '@/components/Confetti'
import { ArrowUpRight, ArrowDownRight, TrendingUp, Activity, Trophy, Crown, Medal } from 'lucide-react'

export default function MarketStage() {
  const { globalState, companies, teams, rounds, roundPrices, isInitialized } = useAppStore()

  // Same notion of "current round" the trading floor uses.
  const phase = globalState?.current_phase || ''
  const currentRoundNum = phase.startsWith('round_')
    ? parseInt(phase.replace('round_', ''), 10)
    : 0

  const currentRound = rounds.find(r => r.round_number === currentRoundNum)

  const getMeanPrice = (companyId: string) => {
    if (currentRound) {
      const rp = roundPrices.find(p => p.round_id === currentRound.id && p.company_id === companyId)
      if (rp) return rp.mean_price
    }
    const company = companies.find(c => c.id === companyId)
    return company?.ipo_price || 0
  }

  // IPO price followed by each round's mean price up to the current round —
  // identical series the participants see on the trading floor.
  const getPriceHistory = (companyId: string) => {
    const company = companies.find(c => c.id === companyId)
    const series: { label: string; value: number }[] = [
      { label: 'IPO', value: company?.ipo_price || 0 },
    ]
    rounds
      .filter(r => r.round_number > 0 && (currentRoundNum === 0 || r.round_number <= currentRoundNum))
      .sort((a, b) => a.round_number - b.round_number)
      .forEach(r => {
        const rp = roundPrices.find(p => p.round_id === r.id && p.company_id === companyId)
        if (rp) series.push({ label: `R${r.round_number}`, value: rp.mean_price })
      })
    return series
  }

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06070a]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    )
  }

  const phaseLabel = currentRoundNum > 0 ? `Round ${currentRoundNum}` : phase.replace(/_/g, ' ')

  // ── Game over → big-screen leaderboard ──────────────────────────────
  // Holdings are liquidated into cash_balance when the game ends, so the stored
  // balance is each team's final net worth (same as the participant /ended view).
  if (phase === 'ended') {
    const leaderboard = [...teams]
      .filter(t => !t.locked)
      .sort((a, b) => b.cash_balance - a.cash_balance)
    return <Leaderboard leaderboard={leaderboard} />
  }

  // Ticker line of every stock's current price, doubled for a seamless scroll.
  const tickerItems = companies.map(c => {
    const price = getMeanPrice(c.id)
    const hist = getPriceHistory(c.id)
    const first = hist[0]?.value || 0
    const up = price >= first
    return { name: c.name, price, up }
  })

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06070a] text-white">
      {/* Animated ambient background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 h-[60vh] w-[60vh] animate-pulse rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vh] animate-pulse rounded-full bg-fuchsia-500/10 blur-[120px]" style={{ animationDelay: '1s' }} />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-10 pt-8">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 ring-1 ring-primary/40">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <span className="font-display text-2xl font-black uppercase tracking-[0.2em] text-white">
                DalaaalStreet
              </span>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-white/40">Live Market</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-[#ff5470]/40 bg-[#ff5470]/15 px-5 py-2.5">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff5470]" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-[#ff5470]" />
            </span>
            <span className="font-display text-lg font-bold uppercase tracking-[0.2em] text-[#ff8298]">
              {phaseLabel || 'Pre-Market'}
            </span>
          </div>
        </div>

        {/* News strip — current round headline, if any */}
        {currentRound?.event_description?.trim() && (
          <div className="mx-10 mt-6 flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.06] px-6 py-3">
            <Activity className="h-5 w-5 shrink-0 text-primary" />
            <p className="font-display truncate text-xl font-bold text-white">
              {currentRound.event_description}
            </p>
          </div>
        )}

        {/* Stock grid — same charts as the participant view, bigger */}
        <div className="flex-1 px-10 py-8">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {companies.map(company => {
              const price = getMeanPrice(company.id)
              const history = getPriceHistory(company.id)
              const first = history[0]?.value || 0
              const isUp = price >= first
              const changePct = first > 0 ? ((price - first) / first) * 100 : 0
              return (
                <div
                  key={company.id}
                  className="surface flex flex-col rounded-3xl border border-white/[0.08] bg-white/[0.025] p-6 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <h3 className="font-display truncate text-2xl font-bold text-white">{company.name}</h3>
                      <p className="truncate text-sm text-white/40">{company.industry}</p>
                    </div>
                    <div
                      className={`flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-sm font-bold ${
                        isUp ? 'bg-green-500/15 text-green-400' : 'bg-[#ff5470]/15 text-[#ff8298]'
                      }`}
                    >
                      {isUp ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                      {Math.abs(changePct).toFixed(1)}%
                    </div>
                  </div>

                  <div className="mt-1">
                    <span
                      className="font-display text-4xl font-black tabular-nums tracking-tight"
                      style={{ color: isUp ? '#22c55e' : '#ff5470' }}
                    >
                      ₹{price.toFixed(2)}
                    </span>
                  </div>

                  <div className="mt-4 h-[200px] w-full">
                    <StockChart data={history} isUp={isUp} variant="screen" />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bottom ticker */}
        <div className="relative overflow-hidden border-t border-white/[0.06] bg-black/40 py-3">
          <div className="flex w-max animate-[ticker_30s_linear_infinite] whitespace-nowrap">
            {[...tickerItems, ...tickerItems].map((t, i) => (
              <span key={i} className="mx-6 inline-flex items-center gap-2 text-lg font-bold">
                <span className="text-white/70">{t.name}</span>
                <span style={{ color: t.up ? '#22c55e' : '#ff5470' }}>
                  ₹{t.price.toFixed(2)}
                </span>
                {t.up ? (
                  <ArrowUpRight className="h-4 w-4 text-green-400" />
                ) : (
                  <ArrowDownRight className="h-4 w-4 text-[#ff8298]" />
                )}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Leaderboard({ leaderboard }: { leaderboard: { id: string; name: string; cash_balance: number }[] }) {
  const inr = (n: number) => '₹' + n.toLocaleString('en-IN')
  const podium = leaderboard.slice(0, 3)
  const rest = leaderboard.slice(3)

  // Render order for the podium: 2nd, 1st, 3rd so the winner sits center & tallest.
  const podiumOrder = [podium[1], podium[0], podium[2]].filter(Boolean)
  const meta: Record<number, { h: string; ring: string; glow: string; icon: typeof Crown; tag: string }> = {
    0: { h: 'h-56', ring: 'ring-yellow-400/60', glow: 'rgba(250,204,21,0.5)', icon: Crown, tag: '#facc15' },
    1: { h: 'h-44', ring: 'ring-slate-300/50', glow: 'rgba(203,213,225,0.4)', icon: Medal, tag: '#cbd5e1' },
    2: { h: 'h-36', ring: 'ring-amber-600/50', glow: 'rgba(217,119,6,0.4)', icon: Medal, tag: '#d97706' },
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06070a] text-white">
      <Confetti run />

      {/* Ambient blooms */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-1/4 top-0 h-[60vh] w-[60vh] animate-pulse rounded-full bg-yellow-400/10 blur-[120px]" />
        <div className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vh] animate-pulse rounded-full bg-fuchsia-500/10 blur-[120px]" style={{ animationDelay: '1s' }} />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '64px 64px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col px-8 py-10">
        {/* Title */}
        <div className="text-center">
          <div className="mb-4 inline-flex items-center gap-3 rounded-full border border-yellow-400/40 bg-yellow-400/10 px-6 py-2">
            <Trophy className="h-5 w-5 text-yellow-400" />
            <span className="text-sm font-black uppercase tracking-[0.35em] text-yellow-300">Final Results</span>
          </div>
          <h1 className="font-display bg-gradient-to-b from-white to-white/50 bg-clip-text text-6xl font-black uppercase tracking-tight text-transparent lg:text-7xl">
            Leaderboard
          </h1>
        </div>

        {/* Podium */}
        <div className="mt-12 flex items-end justify-center gap-4 sm:gap-6">
          {podiumOrder.map((team) => {
            const rank = leaderboard.findIndex(t => t.id === team.id)
            const m = meta[rank]
            const Icon = m.icon
            return (
              <div key={team.id} className="flex w-1/3 max-w-[16rem] flex-col items-center animate-[zoomIn_0.5s_cubic-bezier(0.16,1,0.3,1)]">
                <Icon className="mb-2 h-9 w-9" style={{ color: m.tag, filter: `drop-shadow(0 0 16px ${m.glow})` }} />
                <p className="font-display max-w-full truncate text-center text-xl font-bold text-white">{team.name}</p>
                <p className="font-display mt-1 text-2xl font-black tabular-nums" style={{ color: m.tag }}>{inr(team.cash_balance)}</p>
                <div
                  className={`mt-3 flex ${m.h} w-full items-start justify-center rounded-t-2xl border border-white/10 bg-white/[0.04] pt-4 ring-1 ${m.ring}`}
                  style={{ boxShadow: `0 0 50px -12px ${m.glow}` }}
                >
                  <span className="font-display text-5xl font-black" style={{ color: m.tag }}>#{rank + 1}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* The rest */}
        {rest.length > 0 && (
          <div className="mx-auto mt-8 w-full max-w-3xl space-y-2.5 overflow-y-auto">
            {rest.map((team, i) => (
              <div
                key={team.id}
                className="surface flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] px-6 py-3.5"
              >
                <div className="flex items-center gap-4">
                  <span className="font-display w-8 text-2xl font-black text-white/40">#{i + 4}</span>
                  <span className="font-display text-lg font-bold text-white">{team.name}</span>
                </div>
                <span className="font-display text-xl font-black tabular-nums text-[#76e9a8]">{inr(team.cash_balance)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
