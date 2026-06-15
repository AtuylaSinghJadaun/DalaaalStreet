'use client'

import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useGlobalStore'
import Confetti from '@/components/Confetti'
import { Gavel, Trophy, Zap } from 'lucide-react'

export default function AuctionStage() {
  const { auctions, teams, bids, isInitialized } = useAppStore()

  const [countdown, setCountdown] = useState<number | null>(null)
  const [sold, setSold] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const activeAuction = auctions.find((a) => a.status === 'active')

  // Most recent ended auction — drives the celebration once it's sold.
  const endedAuctions = auctions.filter((a) => a.status === 'ended')
  const lastEnded = endedAuctions[endedAuctions.length - 1]

  const activeBids = bids
    .filter((b) => b.auction_id === activeAuction?.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const lastBid = activeBids[0]

  const highestBidder = teams.find((t) => t.id === activeAuction?.highest_bidder_id)

  // Countdown: reset to 3 on every new bid, tick down at 2s/number, land on 0 = SOLD.
  useEffect(() => {
    if (activeAuction && lastBid) {
      setSold(false)
      setCountdown(3)
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev && prev > 1) return prev - 1
          if (timerRef.current) clearInterval(timerRef.current)
          setSold(true)
          return 0
        })
      }, 2000)
    } else if (activeAuction && !lastBid) {
      setCountdown(null)
      setSold(false)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [lastBid?.id, activeAuction?.id])

  // When the admin actually ends the auction, freeze on the celebration.
  const showCelebration =
    sold && !!activeAuction && !!highestBidder
  const showEndedCelebration =
    !activeAuction && !!lastEnded && !!lastEnded.highest_bidder_id
  const winnerName =
    teams.find((t) => t.id === lastEnded?.highest_bidder_id)?.name || highestBidder?.name

  const inr = (n: number) => '₹' + n.toLocaleString('en-IN')

  // ── Loading ───────────────────────────────────────────────
  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#06070a]">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    )
  }

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

      <Confetti run={showCelebration || showEndedCelebration} />

      {/* Brand bar */}
      <div className="relative z-10 flex items-center justify-center gap-3 pt-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/40">
          <Gavel className="h-5 w-5 text-primary" />
        </div>
        <span className="font-display text-lg font-semibold uppercase tracking-[0.3em] text-white/70">
          DalaaalStreet&nbsp;Auction
        </span>
      </div>

      <div className="relative z-10 flex min-h-[calc(100vh-6rem)] items-center justify-center px-8">
        {/* ── No active auction ───────────────────────────── */}
        {!activeAuction && !showEndedCelebration && (
          <div className="text-center">
            <div className="mx-auto mb-8 flex h-28 w-28 items-center justify-center rounded-full bg-white/5 ring-1 ring-white/10">
              <Gavel className="h-14 w-14 text-white/40" />
            </div>
            <h1 className="font-display text-6xl font-bold tracking-tight text-white/90">
              Get Ready
            </h1>
            <p className="mt-4 text-2xl text-white/40">The next item is about to go under the hammer…</p>
          </div>
        )}

        {/* ── Celebration after admin ends ──────────────────── */}
        {showEndedCelebration && (
          <Celebration item={lastEnded.item_name} winner={winnerName} amount={lastEnded.current_highest_bid} inr={inr} />
        )}

        {/* ── Active auction ───────────────────────────────── */}
        {activeAuction && (
          <div className="w-full max-w-6xl">
            {showCelebration ? (
              <Celebration
                item={activeAuction.item_name}
                winner={winnerName}
                amount={activeAuction.current_highest_bid}
                inr={inr}
              />
            ) : (
              <div className="text-center">
                {/* Live badge */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#ff5470]/40 bg-[#ff5470]/15 px-5 py-2">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#ff5470]" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#ff5470]" />
                  </span>
                  <span className="text-sm font-bold uppercase tracking-[0.25em] text-[#ff8298]">Live Auction</span>
                </div>

                {/* Item name */}
                <h1 className="font-display bg-gradient-to-b from-white to-white/60 bg-clip-text text-7xl font-bold leading-none tracking-tight text-transparent lg:text-8xl">
                  {activeAuction.item_name}
                </h1>
                {activeAuction.description && (
                  <p className="mx-auto mt-4 max-w-3xl text-2xl text-white/40">{activeAuction.description}</p>
                )}

                {/* Current bid */}
                <div className="mt-12">
                  <p className="text-base font-bold uppercase tracking-[0.3em] text-white/40">Current Highest Bid</p>
                  <p
                    key={activeAuction.current_highest_bid}
                    className="font-display mt-2 animate-[pulse_0.4s_ease-out] bg-gradient-to-r from-primary via-cyan-300 to-primary bg-clip-text text-[8rem] font-bold leading-none tracking-tighter text-transparent lg:text-[11rem]"
                    style={{ textShadow: '0 0 80px rgba(52,224,232,0.5)' }}
                  >
                    {inr(activeAuction.current_highest_bid)}
                  </p>
                </div>

                {/* Highest bidder */}
                {highestBidder ? (
                  <div className="mt-8 inline-flex items-center gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-8 py-4">
                    <Trophy className="h-7 w-7 text-yellow-400" />
                    <span className="text-3xl font-bold text-white">{highestBidder.name}</span>
                    <span className="text-lg font-semibold uppercase tracking-wider text-yellow-400/70">leads</span>
                  </div>
                ) : (
                  <p className="mt-8 text-2xl text-white/30">Awaiting the opening bid…</p>
                )}

                {/* Countdown */}
                {countdown !== null && countdown > 0 && (
                  <div className="mt-12">
                    <p className="text-base font-bold uppercase tracking-[0.3em] text-white/40">Going once… going twice…</p>
                    <div
                      key={countdown}
                      className="font-display mx-auto mt-4 flex h-48 w-48 animate-[zoomIn_0.3s_ease-out] items-center justify-center rounded-full border-4 border-[#ff5470]/50 bg-[#ff5470]/10 text-[9rem] font-bold leading-none text-[#ff5470]"
                      style={{ textShadow: '0 0 60px rgba(255,84,112,0.6)' }}
                    >
                      {countdown}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Celebration({
  item,
  winner,
  amount,
  inr,
}: {
  item: string
  winner?: string
  amount: number
  inr: (n: number) => string
}) {
  return (
    <div className="animate-[zoomIn_0.5s_cubic-bezier(0.16,1,0.3,1)] text-center">
      <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-[#3ddc84]/40 bg-[#3ddc84]/15 px-8 py-3">
        <Zap className="h-6 w-6 text-[#3ddc84]" />
        <span className="text-2xl font-black uppercase tracking-[0.3em] text-[#3ddc84]">Sold!</span>
      </div>

      <h1 className="font-display bg-gradient-to-b from-white to-white/50 bg-clip-text text-6xl font-bold tracking-tight text-transparent lg:text-7xl">
        {item}
      </h1>

      <div className="mt-12 flex flex-col items-center gap-3">
        <Trophy className="h-20 w-20 animate-bounce text-yellow-400" style={{ filter: 'drop-shadow(0 0 30px rgba(250,204,21,0.6))' }} />
        <p className="text-xl font-bold uppercase tracking-[0.3em] text-white/40">Winner</p>
        <p className="font-display text-7xl font-bold text-white lg:text-8xl">{winner || 'No bids'}</p>
        <p
          className="font-display mt-4 bg-gradient-to-r from-[#3ddc84] to-emerald-300 bg-clip-text text-6xl font-bold tracking-tight text-transparent"
          style={{ textShadow: '0 0 60px rgba(61,220,132,0.4)' }}
        >
          {inr(amount)}
        </p>
      </div>
    </div>
  )
}
