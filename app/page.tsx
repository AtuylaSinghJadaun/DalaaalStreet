'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useGlobalStore'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { ArrowRight, TrendingUp } from 'lucide-react'

export default function ParticipantLogin() {
  const [teamCode, setTeamCode] = useState('')
  const router = useRouter()
  const { teams, holdings, globalState, isInitialized } = useAppStore()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTeamId = localStorage.getItem('team_id')
      if (savedTeamId && isInitialized && globalState) {
        // Only auto-resume if the saved team still exists. After a full reset
        // the old id is stale, so clear it and stay on the login screen.
        if (teams.some(t => t.id === savedTeamId)) {
          redirectBasedOnPhase(globalState.current_phase)
        } else {
          localStorage.removeItem('team_id')
        }
      }
    }
  }, [isInitialized, globalState, teams, router])

  const redirectBasedOnPhase = (phase: string) => {
    switch (phase) {
      case 'setup':
      case 'waiting_for_ipo':
        router.push('/waiting')
        break
      case 'ipo':
        router.push('/ipo')
        break
      case 'ended':
        router.push('/ended')
        break
      case 'auction':
        router.push('/auction')
        break
      default:
        // Round 1, 2, 3, etc.
        router.push('/trading')
        break
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!isInitialized) {
      toast.error('System not initialized yet.')
      return
    }

    const team = teams.find(t => t.team_code === teamCode)
    
    if (!team) {
      toast.error('Invalid Team Code')
      return
    }

    // A team counts as having participated if its flag is set OR it already
    // holds shares (proof it bought in the IPO) — covers teammates logging in
    // from other devices or after the game has ended.
    const hasHoldings = holdings.some(h => h.team_id === team.id && h.quantity > 0)
    const participated = team.ipo_participant || hasHoldings
    const inIpoWindow =
      !!globalState && ['setup', 'waiting_for_ipo', 'ipo'].includes(globalState.current_phase)

    if (inIpoWindow) {
      // During the IPO window, logging in marks the team as a participant.
      if (!team.ipo_participant) {
        await supabase.from('teams').update({ ipo_participant: true }).eq('id', team.id)
      }
    } else if (!participated) {
      // After Round 1, block only teams that never joined the IPO.
      toast.error('This team did not participate in the IPO.')
      return
    } else if (team.locked) {
      // Participant that was previously (incorrectly) locked — let them back in
      // and clear the stale flag.
      await supabase.from('teams').update({ locked: false }).eq('id', team.id)
    }

    localStorage.setItem('team_id', team.id)
    toast.success(`Welcome, ${team.name}!`)
    if (globalState) {
      redirectBasedOnPhase(globalState.current_phase)
    }
  }

  return (
    <div className="relative min-h-[100dvh] flex flex-col items-center justify-center overflow-hidden bg-[#06070a] px-5 py-10 text-white">
      {/* Ambient neon background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-20 h-72 w-72 rounded-full bg-primary/20 blur-[100px]" />
        <div className="absolute -bottom-24 -right-16 h-72 w-72 rounded-full bg-fuchsia-500/20 blur-[100px]" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.7) 1px, transparent 1px)',
            backgroundSize: '44px 44px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Brand */}
        <div className="mb-10 flex flex-col items-center text-center">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-3xl bg-primary/40 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-cyan-300 shadow-lg">
              <span className="font-display text-4xl font-black text-[#06121a]">₹</span>
            </div>
          </div>
          <h1 className="font-display bg-gradient-to-b from-white to-white/60 bg-clip-text text-5xl font-black uppercase tracking-tight text-transparent">
            DalaaalStreet
          </h1>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1">
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary">Live Trading Arena</span>
          </div>
        </div>

        {/* Login card */}
        <form
          onSubmit={handleLogin}
          className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-xl"
        >
          <label className="mb-2 block text-center text-sm font-semibold text-white/60">
            Enter your Team Code
          </label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="••••••"
            value={teamCode}
            onChange={(e) => setTeamCode(e.target.value)}
            required
            maxLength={6}
            className="w-full rounded-2xl border border-white/10 bg-black/40 py-5 text-center font-mono text-4xl font-black tracking-[0.4em] text-primary placeholder:text-white/20 outline-none transition-all focus:border-primary/60 focus:ring-2 focus:ring-primary/30"
          />
          <button
            type="submit"
            className="group mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-primary to-cyan-300 py-4 text-lg font-black uppercase tracking-wider text-[#06121a] shadow-[0_0_30px_-6px_rgba(52,224,232,0.6)] transition-all active:scale-[0.98]"
          >
            Enter Market
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/30">
          Codes are issued by your mentor. Don&apos;t have one?
        </p>
      </div>
    </div>
  )
}
