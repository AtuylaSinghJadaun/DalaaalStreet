'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, type Trade } from '@/store/useGlobalStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'
import { ArrowDownRight, ArrowUpRight, Clock, CheckCircle2, XCircle } from 'lucide-react'

export default function TradingRoom() {
  const router = useRouter()
  const { globalState, companies, teams, rounds, roundPrices, holdings, trades, isInitialized } = useAppStore()
  const [teamId, setTeamId] = useState<string | null>(null)

  const [tradeCompany, setTradeCompany] = useState<string>('')
  const [tradeQty, setTradeQty] = useState<number | ''>('')
  const [tradePrice, setTradePrice] = useState<number | ''>('')
  const [tradeTargetTeam, setTradeTargetTeam] = useState<string>('')
  const [tradeType, setTradeType] = useState<'buy' | 'sell'>('buy')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTeamId = localStorage.getItem('team_id')
      if (!savedTeamId) router.push('/')
      else setTeamId(savedTeamId)
    }
  }, [router])

  // Clear a stale session (team deleted by a reset) instead of going blank.
  useEffect(() => {
    if (isInitialized && teamId && !teams.some(t => t.id === teamId)) {
      localStorage.removeItem('team_id')
      router.push('/')
    }
  }, [isInitialized, teamId, teams, router])

  useEffect(() => {
    if (globalState && !globalState.current_phase.startsWith('round_')) {
      if (globalState.current_phase === 'ended') router.push('/ended')
      else if (globalState.current_phase === 'auction') router.push('/auction')
      else router.push('/ipo')
    }
  }, [globalState, router])

  const myTeam = teams.find(t => t.id === teamId)
  if (!myTeam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">
          {isInitialized ? 'Loading your session…' : 'Connecting to the market…'}
        </p>
      </div>
    )
  }

  // Determine active round
  const currentRoundNum = parseInt(globalState?.current_phase.replace('round_', '') || '1')
  const currentRound = rounds.find(r => r.round_number === currentRoundNum)
  
  const getCompanyMeanPrice = (companyId: string) => {
    if (!currentRound) return 0
    const priceRecord = roundPrices.find(rp => rp.round_id === currentRound.id && rp.company_id === companyId)
    if (priceRecord) return priceRecord.mean_price
    
    // Fallback to IPO price
    const company = companies.find(c => c.id === companyId)
    return company?.ipo_price || 0
  }

  const handleCreateTrade = async () => {
    if (!tradeCompany || !tradeQty || !tradePrice || !tradeTargetTeam) {
      toast.error('Please fill all fields')
      return
    }

    const meanPrice = getCompanyMeanPrice(tradeCompany)
    const minPrice = meanPrice * 0.8
    const maxPrice = meanPrice * 1.2

    if (tradePrice < minPrice || tradePrice > maxPrice) {
      toast.error(`Price must be within ±20% of mean (₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)})`)
      return
    }

    if (tradeType === 'sell') {
      // Check if I have the shares
      const holding = holdings.find(h => h.team_id === myTeam.id && h.company_id === tradeCompany)
      if (!holding || holding.quantity < tradeQty) {
        toast.error('You do not own enough shares to sell.')
        return
      }
    } else {
      // Check if I have the cash
      const cost = tradeQty * tradePrice
      if (myTeam.cash_balance < cost) {
        toast.error('Insufficient funds to make this buy request.')
        return
      }
    }

    const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString() // 3 mins
    
    const sender = myTeam.id
    const receiver = tradeTargetTeam

    // If it's a 'buy' request, I am asking receiver to sell to me.
    // In our trades table, sender_team_id initiates. Let's encode the direction implicitly or explicitly.
    // For simplicity, a trade record: sender = initiator, receiver = target.
    // But we need to know who is buying and selling.
    // We'll use negative quantity for 'I want to sell', positive for 'I want to buy'? 
    // Let's just add a type or determine by who accepts.
    // Wait, the prompt says "select counterparty team".
    // Since schema didn't have `type`, let's just use quantity > 0 for Buy Request, quantity < 0 for Sell Request.
    // Buy Request (qty > 0): Sender wants to Buy `qty` from Receiver at `price`. Sender pays Receiver.
    // Sell Request (qty < 0): Sender wants to Sell `abs(qty)` to Receiver at `price`. Receiver pays Sender.

    const finalQty = tradeType === 'buy' ? tradeQty : -tradeQty

    try {
      const { error } = await supabase.from('trades').insert({
        sender_team_id: sender,
        receiver_team_id: receiver,
        company_id: tradeCompany,
        quantity: finalQty,
        price: tradePrice,
        status: 'pending',
        expires_at: expiresAt
      })

      if (error) throw error
      toast.success('Trade request sent successfully!')
      setTradeQty('')
      setTradePrice('')
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleRespondToTrade = async (trade: Trade, accept: boolean) => {
    if (!accept) {
      await supabase.from('trades').update({ status: 'rejected' }).eq('id', trade.id)
      toast.success('Trade rejected')
      return
    }

    // Accept Logic
    const isBuyRequest = trade.quantity > 0
    const absQty = Math.abs(trade.quantity)
    const cost = absQty * trade.price

    const buyerId = isBuyRequest ? trade.sender_team_id : trade.receiver_team_id
    const sellerId = isBuyRequest ? trade.receiver_team_id : trade.sender_team_id

    const buyer = teams.find(t => t.id === buyerId)
    const seller = teams.find(t => t.id === sellerId)

    if (!buyer || !seller) return

    if (buyer.cash_balance < cost) {
      toast.error('Buyer has insufficient funds.')
      await supabase.from('trades').update({ status: 'rejected' }).eq('id', trade.id)
      return
    }

    const sellerHolding = holdings.find(h => h.team_id === seller.id && h.company_id === trade.company_id)
    if (!sellerHolding || sellerHolding.quantity < absQty) {
      toast.error('Seller has insufficient shares.')
      await supabase.from('trades').update({ status: 'rejected' }).eq('id', trade.id)
      return
    }

    try {
      // Execute Trade
      await supabase.from('teams').update({ cash_balance: buyer.cash_balance - cost }).eq('id', buyer.id)
      await supabase.from('teams').update({ cash_balance: seller.cash_balance + cost }).eq('id', seller.id)

      await supabase.from('holdings').update({ quantity: sellerHolding.quantity - absQty }).eq('id', sellerHolding.id)
      
      const buyerHolding = holdings.find(h => h.team_id === buyer.id && h.company_id === trade.company_id)
      if (buyerHolding) {
        const totalQty = buyerHolding.quantity + absQty
        const avgPrice = ((buyerHolding.quantity * buyerHolding.average_purchase_price) + cost) / totalQty
        await supabase.from('holdings').update({ quantity: totalQty, average_purchase_price: avgPrice }).eq('id', buyerHolding.id)
      } else {
        await supabase.from('holdings').insert({
          team_id: buyer.id,
          company_id: trade.company_id,
          quantity: absQty,
          average_purchase_price: trade.price
        })
      }

      await supabase.from('trades').update({ status: 'accepted' }).eq('id', trade.id)
      toast.success('Trade accepted and executed!')
    } catch (err: any) {
      toast.error('Trade execution failed: ' + err.message)
    }
  }

  const incomingTrades = trades.filter(t => t.receiver_team_id === myTeam.id && t.status === 'pending')
  const outgoingTrades = trades.filter(t => t.sender_team_id === myTeam.id && t.status === 'pending')

  const myHoldings = holdings.filter(h => h.team_id === myTeam.id && h.quantity > 0)
  const portfolioValue = myHoldings.reduce((sum, h) => sum + (h.quantity * getCompanyMeanPrice(h.company_id)), 0)
  const totalNetWorth = myTeam.cash_balance + portfolioValue

  return (
    <div className="min-h-screen p-6 bg-background text-foreground pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-card p-6 rounded-xl border border-border shadow-lg">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Trading Floor</h1>
          <p className="text-muted-foreground flex items-center gap-2">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">Round {currentRoundNum}</Badge>
            <span>{currentRound?.event_description}</span>
          </p>
        </div>
        <div className="text-right mt-4 md:mt-0">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Net Worth</p>
          <p className="text-3xl font-mono font-black text-primary">₹ {totalNetWorth.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          <p className="text-sm text-muted-foreground">Cash: ₹{myTeam.cash_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>Market Watch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {companies.map(company => {
                  const meanPrice = getCompanyMeanPrice(company.id)
                  const minP = meanPrice * 0.8
                  const maxP = meanPrice * 1.2
                  return (
                    <div key={company.id} className="p-4 rounded-lg bg-secondary/50 border border-border/50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold">{company.name}</h3>
                        <span className="font-mono font-bold text-lg">₹{meanPrice.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mb-4">
                        <span>Min: ₹{minP.toFixed(2)}</span>
                        <span>Max: ₹{maxP.toFixed(2)}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>New Trade Request</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 items-end">
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label>Action</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={tradeType}
                    onChange={(e: any) => setTradeType(e.target.value)}
                  >
                    <option value="buy">I want to Buy</option>
                    <option value="sell">I want to Sell</option>
                  </select>
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label>Company</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={tradeCompany}
                    onChange={(e: any) => setTradeCompany(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Qty</Label>
                  <Input type="number" value={tradeQty} onChange={e => setTradeQty(parseInt(e.target.value))} />
                </div>
                <div className="space-y-2">
                  <Label>Price</Label>
                  <Input type="number" value={tradePrice} onChange={e => setTradePrice(parseFloat(e.target.value))} />
                </div>
                <div className="space-y-2 col-span-2 md:col-span-1">
                  <Label>Target Team</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                    value={tradeTargetTeam}
                    onChange={(e: any) => setTradeTargetTeam(e.target.value)}
                  >
                    <option value="">Select...</option>
                    {teams.filter(t => t.id !== myTeam.id && !t.locked).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
              </div>
              <Button className="w-full mt-4" onClick={handleCreateTrade}>Send Request</Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>Trade Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="incoming">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="incoming">Incoming ({incomingTrades.length})</TabsTrigger>
                  <TabsTrigger value="outgoing">Outgoing ({outgoingTrades.length})</TabsTrigger>
                </TabsList>
                <TabsContent value="incoming" className="space-y-3">
                  {incomingTrades.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No incoming requests</p>}
                  {incomingTrades.map(trade => {
                    const c = companies.find(x => x.id === trade.company_id)
                    const sender = teams.find(x => x.id === trade.sender_team_id)
                    const isBuy = trade.quantity > 0
                    return (
                      <div key={trade.id} className="p-3 border border-border rounded-lg bg-secondary/30">
                        <p className="text-sm">
                          <span className="font-bold">{sender?.name}</span> wants to <span className="font-bold text-primary">{isBuy ? 'BUY from you' : 'SELL to you'}</span>
                        </p>
                        <p className="text-lg font-mono font-bold my-1">
                          {Math.abs(trade.quantity)} {c?.name} @ ₹{trade.price}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Button size="sm" className="flex-1 bg-green-600 hover:bg-green-700 text-white" onClick={() => handleRespondToTrade(trade, true)}>Accept</Button>
                          <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleRespondToTrade(trade, false)}>Reject</Button>
                        </div>
                      </div>
                    )
                  })}
                </TabsContent>
                <TabsContent value="outgoing" className="space-y-3">
                  {outgoingTrades.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">No pending outgoing requests</p>}
                  {outgoingTrades.map(trade => {
                    const c = companies.find(x => x.id === trade.company_id)
                    const target = teams.find(x => x.id === trade.receiver_team_id)
                    const isBuy = trade.quantity > 0
                    return (
                      <div key={trade.id} className="p-3 border border-border rounded-lg bg-secondary/30">
                        <p className="text-sm">
                          You want to <span className="font-bold text-primary">{isBuy ? 'BUY from' : 'SELL to'}</span> <span className="font-bold">{target?.name}</span>
                        </p>
                        <p className="text-lg font-mono font-bold my-1">
                          {Math.abs(trade.quantity)} {c?.name} @ ₹{trade.price}
                        </p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                          <Clock className="w-3 h-3" /> Pending Target Approval
                        </p>
                      </div>
                    )
                  })}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          <Card className="bg-card border-border shadow-md">
            <CardHeader>
              <CardTitle>My Portfolio</CardTitle>
            </CardHeader>
            <CardContent>
              {myHoldings.length === 0 && <p className="text-muted-foreground text-sm">No shares owned yet.</p>}
              <div className="space-y-3">
                {myHoldings.map(h => {
                  const c = companies.find(x => x.id === h.company_id)
                  const currentPrice = getCompanyMeanPrice(h.company_id)
                  const currentValue = h.quantity * currentPrice
                  const profit = currentValue - (h.quantity * h.average_purchase_price)
                  const isProfit = profit >= 0
                  return (
                    <div key={h.id} className="flex justify-between items-center p-3 border border-border rounded-lg bg-secondary/10">
                      <div>
                        <p className="font-bold">{c?.name}</p>
                        <p className="text-xs text-muted-foreground">{h.quantity} shares @ ₹{h.average_purchase_price.toFixed(2)} avg</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono font-bold">₹{currentValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className={`text-xs flex items-center justify-end gap-1 ${isProfit ? 'text-green-500' : 'text-red-500'}`}>
                          {isProfit ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          ₹{Math.abs(profit).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
