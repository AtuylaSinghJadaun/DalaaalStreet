'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useGlobalStore'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { LineChart, Line, ResponsiveContainer, YAxis } from 'recharts'

export default function IPORoom() {
  const router = useRouter()
  const { globalState, companies, teams, holdings, isInitialized } = useAppStore()
  const [teamId, setTeamId] = useState<string | null>(null)
  const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({})

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTeamId = localStorage.getItem('team_id')
      if (!savedTeamId) router.push('/')
      else setTeamId(savedTeamId)
    }
  }, [router])

  // If the saved team no longer exists (e.g. the street was reset & rebuilt),
  // clear the stale id and send the user back to login instead of going blank.
  useEffect(() => {
    if (isInitialized && teamId && !teams.some(t => t.id === teamId)) {
      localStorage.removeItem('team_id')
      router.push('/')
    }
  }, [isInitialized, teamId, teams, router])

  useEffect(() => {
    if (globalState && globalState.current_phase !== 'ipo') {
      if (globalState.current_phase === 'setup' || globalState.current_phase === 'waiting_for_ipo') {
        router.push('/waiting')
      } else {
        router.push('/trading')
      }
    }
  }, [globalState, router])

  const myTeam = teams.find(t => t.id === teamId)
  
  const handleBuy = async (companyId: string) => {
    const qty = buyQuantities[companyId] || 0
    if (qty <= 0) return
    if (!myTeam) return

    const company = companies.find(c => c.id === companyId)
    if (!company) return

    const cost = qty * company.ipo_price
    if (myTeam.cash_balance < cost) {
      toast.error('Insufficient funds!')
      return
    }

    try {
      // Very simple transaction logic (in prototype, just update both tables)
      const newBalance = myTeam.cash_balance - cost
      
      const { error: teamError } = await supabase.from('teams').update({ cash_balance: newBalance }).eq('id', myTeam.id)
      if (teamError) throw teamError

      const existingHolding = holdings.find(h => h.team_id === myTeam.id && h.company_id === companyId)
      
      if (existingHolding) {
        const totalQty = existingHolding.quantity + qty
        const avgPrice = ((existingHolding.quantity * existingHolding.average_purchase_price) + cost) / totalQty
        await supabase.from('holdings').update({ quantity: totalQty, average_purchase_price: avgPrice }).eq('id', existingHolding.id)
      } else {
        await supabase.from('holdings').insert({
          team_id: myTeam.id,
          company_id: companyId,
          quantity: qty,
          average_purchase_price: company.ipo_price
        })
      }

      toast.success(`Purchased ${qty} shares of ${company.name}`)
      setBuyQuantities(prev => ({ ...prev, [companyId]: 0 }))
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  // Small dummy chart data just for visual effect in IPO
  const dummyData = [{ value: 100 }, { value: 105 }, { value: 102 }, { value: 110 }]

  // While the store loads (or we're about to redirect a stale session), show a
  // loader rather than a blank screen.
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

  return (
    <div className="min-h-screen p-6 bg-background text-foreground pb-24">
      <header className="flex justify-between items-center mb-8 bg-card p-4 rounded-xl border border-border sticky top-4 z-10 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">IPO Phase</h1>
          <p className="text-sm text-muted-foreground">{myTeam.name}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Cash Balance</p>
          <p className="text-2xl font-mono font-bold text-primary">₹ {myTeam.cash_balance.toLocaleString()}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {companies.map(company => (
          <Card key={company.id} className="overflow-hidden bg-card border-border hover:border-primary/50 transition-all group shadow-md hover:shadow-[0_0_20px_rgba(var(--primary),0.2)]">
            <CardHeader className="pb-2 relative">
              <div className="absolute top-4 right-4 text-xs font-bold px-2 py-1 bg-primary/20 text-primary rounded-md uppercase">
                IPO
              </div>
              <CardTitle className="text-xl font-bold">{company.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{company.industry}</p>
            </CardHeader>
            <CardContent>
              <div className="h-[60px] w-full mb-4 opacity-50 group-hover:opacity-100 transition-opacity">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dummyData}>
                    <YAxis domain={['dataMin - 10', 'dataMax + 10']} hide />
                    <Line type="monotone" dataKey="value" stroke="var(--primary)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-muted-foreground uppercase">Price</p>
                  <p className="text-2xl font-mono font-bold">₹ {company.ipo_price}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground uppercase">Available</p>
                  <p className="text-sm font-mono">{company.available_shares}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                <Input 
                  type="number" 
                  min="1" 
                  placeholder="Qty" 
                  className="bg-background font-mono"
                  value={buyQuantities[company.id] || ''}
                  onChange={(e) => setBuyQuantities(prev => ({...prev, [company.id]: parseInt(e.target.value) || 0}))}
                />
                <Button className="w-24 font-bold uppercase" onClick={() => handleBuy(company.id)}>
                  Buy
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
