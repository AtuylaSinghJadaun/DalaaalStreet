'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useGlobalStore'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { Timer, Trophy, CheckCircle } from 'lucide-react'

export default function AuctionRoom() {
  const router = useRouter()
  const { globalState, teams, auctions, bids, inventory } = useAppStore()
  const [teamId, setTeamId] = useState<string | null>(null)

  const [customBid, setCustomBid] = useState<string>('')
  const [countdown, setCountdown] = useState<number | null>(null)
  
  // Timer ref to manage countdown
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTeamId = localStorage.getItem('team_id')
      if (!savedTeamId) router.push('/')
      else setTeamId(savedTeamId)
    }
  }, [router])

  useEffect(() => {
    if (globalState && globalState.current_phase !== 'auction') {
      router.push('/ended')
    }
  }, [globalState, router])

  const myTeam = teams.find(t => t.id === teamId)
  
  const activeAuction = auctions.find(a => a.status === 'active')
  
  // Track last bid time to reset countdown
  const activeBids = bids.filter(b => b.auction_id === activeAuction?.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
  const lastBid = activeBids[0]

  useEffect(() => {
    if (activeAuction && lastBid) {
      // Whenever a new bid comes in, reset countdown to 3
      setCountdown(3)
      
      if (timerRef.current) clearInterval(timerRef.current)
      
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev && prev > 1) return prev - 1
          
          // Countdown reached 0
          if (timerRef.current) clearInterval(timerRef.current)
          
          // If admin logic is handled via edge function, we just wait.
          // For prototype, any client could theoretically end it, but let's assume Admin ends it,
          // or we just show "Going once..." etc.
          return 0
        })
      }, 1000)
    } else if (activeAuction && !lastBid) {
      setCountdown(null)
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [lastBid?.id, activeAuction?.id])


  if (!myTeam) return null

  const handleBid = async (amount: number) => {
    if (!activeAuction) return
    
    if (amount <= activeAuction.current_highest_bid) {
      toast.error('Bid must be higher than current highest bid')
      return
    }

    if (amount > myTeam.cash_balance) {
      toast.error('Insufficient funds for this bid')
      return
    }

    try {
      // Create bid
      await supabase.from('bids').insert({
        auction_id: activeAuction.id,
        team_id: myTeam.id,
        amount: amount
      })

      // Update auction highest bid
      await supabase.from('auctions').update({
        current_highest_bid: amount,
        highest_bidder_id: myTeam.id
      }).eq('id', activeAuction.id)
      
      toast.success('Bid placed successfully!')
      setCustomBid('')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleCustomBid = () => {
    const amount = parseInt(customBid)
    if (isNaN(amount)) return
    handleBid(amount)
  }

  const myInventory = inventory.filter(i => i.team_id === myTeam.id)
  
  const handleUseItem = async (itemId: string) => {
    try {
      await supabase.from('inventory').update({ status: 'used' }).eq('id', itemId)
      toast.success('Item redeemed!')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="min-h-screen p-6 bg-background text-foreground pb-24">
      <header className="flex justify-between items-center mb-8 bg-card p-6 rounded-xl border border-border shadow-lg">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Auction Center</h1>
          <p className="text-muted-foreground">Spend your final portfolio balance on exclusive rewards.</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Your Balance</p>
          <p className="text-3xl font-mono font-black text-primary">₹ {myTeam.cash_balance.toLocaleString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {!activeAuction ? (
            <Card className="bg-card border-border shadow-md h-full flex flex-col items-center justify-center p-12 text-center">
              <div className="w-20 h-20 bg-secondary rounded-full flex items-center justify-center mb-4">
                <Timer className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold">No Active Auction</h2>
              <p className="text-muted-foreground mt-2">Waiting for the auctioneer to start the next item...</p>
            </Card>
          ) : (
            <Card className="bg-card border-border shadow-[0_0_30px_rgba(var(--primary),0.2)] animate-in fade-in zoom-in duration-300">
              <CardHeader className="text-center pb-2">
                <div className="inline-block px-3 py-1 bg-red-500/20 text-red-500 rounded-full text-xs font-bold uppercase tracking-wider mb-4 animate-pulse">
                  Live Auction
                </div>
                <CardTitle className="text-4xl font-black tracking-tight">{activeAuction.item_name}</CardTitle>
                <CardDescription className="text-lg mt-2">{activeAuction.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-8">
                
                <div className="flex flex-col items-center p-8 bg-secondary/30 rounded-xl border border-border">
                  <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold mb-2">Current Highest Bid</p>
                  <p className="text-6xl font-mono font-black text-primary">₹ {activeAuction.current_highest_bid.toLocaleString()}</p>
                  
                  {activeAuction.highest_bidder_id && (
                    <div className="mt-4 flex items-center gap-2 bg-background px-4 py-2 rounded-full border border-border">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="font-bold">
                        {teams.find(t => t.id === activeAuction.highest_bidder_id)?.name || 'Unknown Team'}
                      </span>
                      {activeAuction.highest_bidder_id === myTeam.id && <span className="text-primary text-xs font-bold uppercase ml-2">(You)</span>}
                    </div>
                  )}

                  {countdown !== null && (
                    <div className="mt-6 text-center">
                      <p className="text-sm text-muted-foreground uppercase">Going in</p>
                      <p className={`text-5xl font-black font-mono ${countdown === 0 ? 'text-red-500' : 'text-foreground'}`}>
                        {countdown > 0 ? countdown : 'SOLD!'}
                      </p>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <p className="text-center font-bold text-muted-foreground uppercase tracking-wider text-sm">Place Your Bid</p>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <Button 
                      size="lg" 
                      className="text-lg h-16 font-bold"
                      onClick={() => handleBid(activeAuction.current_highest_bid + 50000)}
                      disabled={countdown === 0}
                    >
                      + ₹ 50,000
                    </Button>
                    <Button 
                      size="lg" 
                      className="text-lg h-16 font-bold"
                      onClick={() => handleBid(activeAuction.current_highest_bid + 100000)}
                      disabled={countdown === 0}
                    >
                      + ₹ 1,00,000
                    </Button>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <Input 
                      type="number" 
                      placeholder="Custom amount..." 
                      className="h-16 text-xl font-mono"
                      value={customBid}
                      onChange={(e) => setCustomBid(e.target.value)}
                      disabled={countdown === 0}
                    />
                    <Button 
                      size="lg" 
                      className="h-16 px-8 text-lg font-bold"
                      onClick={handleCustomBid}
                      disabled={countdown === 0 || !customBid}
                    >
                      Bid Custom
                    </Button>
                  </div>
                </div>

              </CardContent>
            </Card>
          )}
        </div>

        <div>
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>My Inventory</CardTitle>
              <CardDescription>Rewards you have won</CardDescription>
            </CardHeader>
            <CardContent>
              {myInventory.length === 0 && (
                <p className="text-muted-foreground text-sm text-center py-8">Your inventory is empty</p>
              )}
              <div className="space-y-3">
                {myInventory.map(item => (
                  <div key={item.id} className="p-4 border border-border rounded-lg bg-secondary/30 flex justify-between items-center">
                    <div>
                      <p className="font-bold">{item.item_name}</p>
                      <p className="text-xs text-muted-foreground uppercase">{item.status}</p>
                    </div>
                    {item.status === 'unused' ? (
                      <Button size="sm" onClick={() => handleUseItem(item.id)}>Use</Button>
                    ) : (
                      <CheckCircle className="text-green-500 w-6 h-6" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
