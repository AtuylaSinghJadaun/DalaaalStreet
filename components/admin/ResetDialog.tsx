'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useGlobalStore'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  RotateCcw,
  Trash2,
  AlertTriangle,
  X,
  ArrowLeft,
  Loader2,
  Check,
  ChevronRight,
} from 'lucide-react'

const ZERO = '00000000-0000-0000-0000-000000000000'

type Mode = 'choose' | 'soft' | 'hard'

export default function ResetDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const { globalState } = useAppStore()
  const [mode, setMode] = useState<Mode>('choose')
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const close = () => {
    if (loading) return
    setMode('choose')
    onClose()
  }

  // ── Soft reset: keep teams / companies / rounds, return to pre-IPO ──
  const runSoftReset = async () => {
    setLoading(true)
    const t = toast.loading('Resetting progress…')
    try {
      const initialBalance = globalState?.initial_team_balance || 1000000

      // Clear all participant-generated game data
      await Promise.all([
        supabase.from('trades').delete().neq('id', ZERO),
        supabase.from('holdings').delete().neq('id', ZERO),
        supabase.from('bids').delete().neq('id', ZERO),
        supabase.from('inventory').delete().neq('id', ZERO),
      ])
      // Auctions reference bids, so clear them after
      await supabase.from('auctions').delete().neq('id', ZERO)

      // Restore teams to their starting state (balance, unlocked, not in IPO)
      await supabase
        .from('teams')
        .update({ cash_balance: initialBalance, ipo_participant: false, locked: false })
        .neq('id', ZERO)

      // Rounds back to idle
      await supabase.from('rounds').update({ is_active: false }).neq('id', ZERO)

      // Back to the pre-IPO lobby
      await supabase.from('global_state').update({ current_phase: 'waiting_for_ipo' }).eq('id', 1)

      toast.success('Game reset to the pre-IPO lobby', { id: t })
      close()
    } catch (err: any) {
      toast.error('Reset failed: ' + err.message, { id: t })
    } finally {
      setLoading(false)
    }
  }

  // ── Full reset: erase everything, return to the setup wizard ──
  const runHardReset = async () => {
    setLoading(true)
    const t = toast.loading('Wiping the street…')
    try {
      // Leaf rows that reference teams / companies / rounds / auctions
      await Promise.all([
        supabase.from('trades').delete().neq('id', ZERO),
        supabase.from('holdings').delete().neq('id', ZERO),
        supabase.from('bids').delete().neq('id', ZERO),
        supabase.from('inventory').delete().neq('id', ZERO),
        supabase.from('round_prices').delete().neq('id', ZERO),
      ])
      // Then the core entities
      await Promise.all([
        supabase.from('auctions').delete().neq('id', ZERO),
        supabase.from('rounds').delete().neq('id', ZERO),
        supabase.from('companies').delete().neq('id', ZERO),
        supabase.from('teams').delete().neq('id', ZERO),
      ])

      // Back to the very beginning — the setup wizard
      await supabase.from('global_state').update({ current_phase: 'setup' }).eq('id', 1)

      toast.success('Everything wiped — rebuild the street from scratch', { id: t })
      close()
    } catch (err: any) {
      toast.error('Reset failed: ' + err.message, { id: t })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="surface animate-slide-in w-full max-w-lg rounded-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {mode === 'choose' && (
          <>
            <div className="mb-5 flex items-start justify-between">
              <div>
                <p className="eyebrow mb-1.5">Danger Zone</p>
                <h2 className="font-display text-xl font-semibold text-white">Reset Competition</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose how far back you want to go.</p>
              </div>
              <button
                onClick={close}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Soft */}
              <button
                onClick={() => setMode('soft')}
                className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-200 hover:border-primary/40 hover:bg-primary/[0.06]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary ring-1 ring-primary/25">
                  <RotateCcw className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">Reset progress only</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Back to the pre-IPO lobby. Keeps your teams, companies &amp; rounds.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>

              {/* Hard */}
              <button
                onClick={() => setMode('hard')}
                className="group flex w-full items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all duration-200 hover:border-[#ff5470]/40 hover:bg-[#ff5470]/[0.06]"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff5470]/12 text-[#ff8298] ring-1 ring-[#ff5470]/25">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white">Wipe everything &amp; rebuild</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    Deletes all teams, companies &amp; rounds. Returns to the setup wizard.
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </button>
            </div>
          </>
        )}

        {mode === 'soft' && (
          <ConfirmView
            tone="accent"
            icon={<RotateCcw className="h-5 w-5" />}
            title="Reset progress only"
            onBack={() => setMode('choose')}
            onConfirm={runSoftReset}
            loading={loading}
            confirmLabel="Reset to pre-IPO"
            keeps={['Teams (names, codes & count)', 'Companies & their prices', 'Rounds & end prices']}
            clears={[
              'All trades & holdings',
              'Auctions, bids & won inventory',
              'Locked team statuses',
              'Restores starting balances',
            ]}
          />
        )}

        {mode === 'hard' && (
          <ConfirmView
            tone="danger"
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Wipe everything & rebuild"
            onBack={() => setMode('choose')}
            onConfirm={runHardReset}
            loading={loading}
            confirmLabel="Delete all & rebuild"
            danger
            clears={[
              'Every team, company & round',
              'All prices, trades & holdings',
              'Auctions, bids & inventory',
              'Returns you to the setup wizard',
            ]}
          />
        )}
      </div>
    </div>
  )
}

function ConfirmView({
  tone,
  icon,
  title,
  onBack,
  onConfirm,
  loading,
  confirmLabel,
  keeps,
  clears,
  danger,
}: {
  tone: 'accent' | 'danger'
  icon: React.ReactNode
  title: string
  onBack: () => void
  onConfirm: () => void
  loading: boolean
  confirmLabel: string
  keeps?: string[]
  clears: string[]
  danger?: boolean
}) {
  const accent = tone === 'danger' ? '#ff8298' : 'var(--primary)'
  return (
    <>
      <div className="mb-5 flex items-center gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-white/[0.06] hover:text-white disabled:opacity-50"
        >
          <ArrowLeft className="h-4.5 w-4.5" />
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${tone === 'danger' ? '#ff5470' : '#34e0e8'}22`, color: accent }}
        >
          {icon}
        </div>
        <h2 className="font-display text-lg font-semibold text-white">{title}</h2>
      </div>

      {danger && (
        <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[#ff5470]/30 bg-[#ff5470]/[0.08] p-3 text-sm text-[#ff8298]">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>This permanently deletes all configured data. It cannot be undone.</span>
        </div>
      )}

      <div className="space-y-4">
        {keeps && (
          <div>
            <p className="eyebrow mb-2">Kept</p>
            <ul className="space-y-1.5">
              {keeps.map((k) => (
                <li key={k} className="flex items-center gap-2 text-sm text-gray-300">
                  <Check className="h-3.5 w-3.5 shrink-0 text-[#76e9a8]" />
                  {k}
                </li>
              ))}
            </ul>
          </div>
        )}
        <div>
          <p className="eyebrow mb-2">{danger ? 'Deleted' : 'Cleared'}</p>
          <ul className="space-y-1.5">
            {clears.map((c) => (
              <li key={c} className="flex items-center gap-2 text-sm text-gray-300">
                <X className="h-3.5 w-3.5 shrink-0 text-[#ff8298]" />
                {c}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <button
          onClick={onBack}
          disabled={loading}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-200 transition-colors hover:bg-white/[0.07] disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-60 ${
            danger
              ? 'border border-[#ff5470]/50 bg-[#ff5470]/15 text-[#ff8298] hover:bg-[#ff5470]/25'
              : 'border border-primary/50 bg-primary/15 text-primary hover:bg-primary/25'
          }`}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {confirmLabel}
        </button>
      </div>
    </>
  )
}
