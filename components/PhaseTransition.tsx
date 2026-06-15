'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAppStore, type GlobalPhase, type Round } from '@/store/useGlobalStore'
import { Newspaper, Rocket, TrendingUp, Gavel, Flag, Sparkles } from 'lucide-react'

interface PhaseInfo {
  kind: 'ipo' | 'round' | 'ended' | 'auction'
  eyebrow: string          // small uppercase line, e.g. "Round 2 begins"
  headline: string         // big phase title, e.g. "Round 2"
  /** Optional news article — typed out. Empty string => no news for this phase. */
  news: string
  /** Optional short label under the headline (round title / flavour). */
  subtitle: string
  icon: typeof TrendingUp
  accent: string           // hex accent for glows/badges
}

// Phases that are worth interrupting the screen for. Setup / waiting are silent.
const ANNOUNCED: GlobalPhase[] = [
  'ipo', 'round_1', 'round_2', 'round_3', 'round_4', 'round_5', 'ended', 'auction',
]

function buildPhaseInfo(phase: GlobalPhase, rounds: Round[]): PhaseInfo | null {
  if (phase === 'ipo') {
    return {
      kind: 'ipo',
      eyebrow: 'The market is opening',
      headline: 'IPO is Live',
      news: '',
      subtitle: 'Grab your shares before trading begins',
      icon: Rocket,
      accent: '#34e0e8',
    }
  }
  if (phase === 'ended') {
    return {
      kind: 'ended',
      eyebrow: 'The bell has rung',
      headline: 'Trading Closed',
      news: '',
      subtitle: 'Holdings liquidated at final prices',
      icon: Flag,
      accent: '#ffd23f',
    }
  }
  if (phase === 'auction') {
    return {
      kind: 'auction',
      eyebrow: 'Going once, going twice',
      headline: 'Auction Time',
      news: '',
      subtitle: 'Spend your winnings on the rewards',
      icon: Gavel,
      accent: '#b537f2',
    }
  }
  if (phase.startsWith('round_')) {
    const num = parseInt(phase.replace('round_', ''), 10)
    const round = rounds.find(r => r.round_number === num)
    return {
      kind: 'round',
      eyebrow: `Round ${num} begins`,
      headline: `Round ${num}`,
      // The news article is optional — fall back to an empty string so the UI
      // simply omits the typed headline block when none is configured.
      news: round?.event_description?.trim() || '',
      subtitle: round?.title?.trim() || '',
      icon: TrendingUp,
      accent: '#34e0e8',
    }
  }
  return null
}

/** Typewriter: reveals `text` one character at a time once `active` is true. */
function useTypewriter(text: string, active: boolean, speed = 38) {
  const [shown, setShown] = useState('')
  useEffect(() => {
    if (!active || !text) {
      setShown('')
      return
    }
    setShown('')
    let i = 0
    const id = setInterval(() => {
      i++
      setShown(text.slice(0, i))
      if (i >= text.length) clearInterval(id)
    }, speed)
    return () => clearInterval(id)
  }, [text, active, speed])
  return shown
}

/**
 * Watches `globalState.current_phase` and, whenever it changes, drops a
 * full-screen cinematic announcement of the new phase. For market rounds it
 * types out that round's news headline (if one exists). Mounted globally so
 * both participants and the big-screen view react to the same signal.
 */
export default function PhaseTransition() {
  const pathname = usePathname()
  const { globalState, rounds, isInitialized } = useAppStore()
  const phase = globalState?.current_phase

  const [info, setInfo] = useState<PhaseInfo | null>(null)
  const [visible, setVisible] = useState(false)
  const prevPhase = useRef<GlobalPhase | null>(null)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!isInitialized || !phase) return

    // First observation just records the baseline — don't announce on load.
    if (prevPhase.current === null) {
      prevPhase.current = phase
      return
    }
    if (phase === prevPhase.current) return
    prevPhase.current = phase

    if (!ANNOUNCED.includes(phase)) return
    const next = buildPhaseInfo(phase, rounds)
    if (!next) return

    setInfo(next)
    setVisible(true)
    if (hideTimer.current) clearTimeout(hideTimer.current)
    // Linger long enough to read a typed headline on the big screen.
    hideTimer.current = setTimeout(() => setVisible(false), next.news ? 9000 : 5500)
  }, [phase, isInitialized, rounds])

  useEffect(() => () => { if (hideTimer.current) clearTimeout(hideTimer.current) }, [])

  const typed = useTypewriter(info?.news ?? '', visible && !!info?.news)

  // Never cover the admin console — the mentor is the one driving the change.
  if (pathname?.startsWith('/admin')) return null
  if (!info || !visible) return null

  const Icon = info.icon

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-[#06070a]/92 backdrop-blur-xl animate-[phaseFade_0.5s_ease-out]"
      onClick={() => setVisible(false)}
    >
      {/* Ambient accent blooms */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute -left-1/4 top-0 h-[60vh] w-[60vh] animate-pulse rounded-full blur-[120px]"
          style={{ backgroundColor: `${info.accent}22` }}
        />
        <div
          className="absolute -right-1/4 bottom-0 h-[60vh] w-[60vh] animate-pulse rounded-full blur-[120px]"
          style={{ backgroundColor: `${info.accent}22`, animationDelay: '0.8s' }}
        />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '54px 54px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-4xl px-8 text-center">
        {/* Icon badge */}
        <div
          className="mx-auto mb-7 flex h-20 w-20 items-center justify-center rounded-3xl ring-1 animate-[zoomIn_0.5s_cubic-bezier(0.16,1,0.3,1)]"
          style={{
            backgroundColor: `${info.accent}1f`,
            boxShadow: `0 0 60px -10px ${info.accent}`,
            borderColor: `${info.accent}55`,
          }}
        >
          <Icon className="h-10 w-10" style={{ color: info.accent }} />
        </div>

        {/* Eyebrow */}
        <p
          className="mb-3 text-sm font-bold uppercase tracking-[0.4em] animate-[phaseFade_0.6s_ease-out]"
          style={{ color: info.accent }}
        >
          {info.eyebrow}
        </p>

        {/* Headline */}
        <h1 className="font-display bg-gradient-to-b from-white to-white/50 bg-clip-text text-7xl font-black uppercase leading-none tracking-tight text-transparent animate-[zoomIn_0.45s_cubic-bezier(0.16,1,0.3,1)] lg:text-8xl">
          {info.headline}
        </h1>

        {info.subtitle && (
          <p className="mt-4 text-2xl font-medium text-white/55 animate-[phaseFade_0.8s_ease-out]">
            {info.subtitle}
          </p>
        )}

        {/* News article — typed, bold. Only when a headline exists. */}
        {info.news && (
          <div
            className="mx-auto mt-10 max-w-3xl rounded-2xl border bg-white/[0.03] px-7 py-6 text-left backdrop-blur-md animate-[phaseFade_1s_ease-out]"
            style={{ borderColor: `${info.accent}33` }}
          >
            <div className="mb-3 flex items-center gap-2">
              <Newspaper className="h-4 w-4" style={{ color: info.accent }} />
              <span
                className="text-xs font-bold uppercase tracking-[0.3em]"
                style={{ color: info.accent }}
              >
                Breaking News
              </span>
            </div>
            <p className="font-display text-2xl font-bold leading-snug text-white lg:text-3xl">
              {typed}
              <span className="ml-0.5 inline-block w-[2px] animate-pulse bg-white/80 align-middle" style={{ height: '1em' }} />
            </p>
          </div>
        )}

        <p className="mt-10 flex items-center justify-center gap-2 text-xs uppercase tracking-[0.3em] text-white/30">
          <Sparkles className="h-3.5 w-3.5" />
          Tap anywhere to continue
        </p>
      </div>
    </div>
  )
}
