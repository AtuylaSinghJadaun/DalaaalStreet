'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useGlobalStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

export default function EndedRoom() {
  const router = useRouter()
  const { globalState, teams, holdings, companies, roundPrices, rounds } = useAppStore()
  const [teamId, setTeamId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTeamId = localStorage.getItem('team_id')
      if (!savedTeamId) router.push('/')
      else setTeamId(savedTeamId)
    }
  }, [router])

  useEffect(() => {
    if (globalState?.current_phase === 'auction') {
      router.push('/auction')
    } else if (globalState && globalState.current_phase !== 'ended') {
      router.push('/')
    }
  }, [globalState, router])

  const myTeam = teams.find(t => t.id === teamId)
  if (!myTeam) return null

  // Determine final prices
  // If we assume final round is the last round, or we can just find the max round number
  const finalRoundNum = Math.max(...rounds.map(r => r.round_number))
  const finalRound = rounds.find(r => r.round_number === finalRoundNum)
  
  const getCompanyFinalPrice = (companyId: string) => {
    if (!finalRound) return 0
    const priceRecord = roundPrices.find(rp => rp.round_id === finalRound.id && rp.company_id === companyId)
    return priceRecord ? priceRecord.mean_price : 0
  }

  // Calculate final leaderboards
  // For each team, Net Worth = Cash + sum(holding.qty * finalPrice)
  const leaderboard = teams.filter(t => t.ipo_participant && !t.locked).map(team => {
    const teamHoldings = holdings.filter(h => h.team_id === team.id)
    const portfolioValue = teamHoldings.reduce((sum, h) => sum + (h.quantity * getCompanyFinalPrice(h.company_id)), 0)
    const netWorth = team.cash_balance + portfolioValue
    const profit = netWorth - (globalState?.initial_team_balance || 1000000)
    
    return {
      ...team,
      portfolioValue,
      netWorth,
      profit
    }
  }).sort((a, b) => b.netWorth - a.netWorth)

  const myRank = leaderboard.findIndex(t => t.id === myTeam.id) + 1
  const myStats = leaderboard.find(t => t.id === myTeam.id)

  return (
    <div className="min-h-screen p-6 bg-background text-foreground pb-24">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 bg-card p-6 rounded-xl border border-border shadow-[0_0_20px_rgba(var(--primary),0.1)]">
        <div>
          <h1 className="text-3xl font-black tracking-tight uppercase">Trading Ended</h1>
          <p className="text-muted-foreground mt-1">The market is closed. All shares have been liquidated at final round prices.</p>
        </div>
        <div className="text-right mt-4 md:mt-0">
          <p className="text-sm text-muted-foreground uppercase tracking-wider font-bold">Your Final Rank</p>
          <p className="text-4xl font-mono font-black text-primary">#{myRank || '-'}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle>Final Cash Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-mono font-bold">₹ {myStats?.netWorth.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-2">Available for Auction</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle>Total Profit / Loss</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-3xl font-mono font-bold ${(myStats?.profit || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              ₹ {myStats?.profit.toLocaleString()}
            </p>
            <p className="text-sm text-muted-foreground mt-2">From initial balance</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card border-border shadow-md">
        <CardHeader>
          <CardTitle>Final Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Rank</TableHead>
                <TableHead>Team</TableHead>
                <TableHead className="text-right">Final Net Worth</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leaderboard.map((team, index) => (
                <TableRow key={team.id} className={team.id === myTeam.id ? 'bg-primary/10' : ''}>
                  <TableCell className="font-bold">
                    {index === 0 && <span className="text-yellow-500 mr-2">🥇</span>}
                    {index === 1 && <span className="text-gray-400 mr-2">🥈</span>}
                    {index === 2 && <span className="text-amber-600 mr-2">🥉</span>}
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-bold">
                    {team.name}
                    {team.id === myTeam.id && <Badge className="ml-2">You</Badge>}
                  </TableCell>
                  <TableCell className="text-right font-mono font-bold">₹ {team.netWorth.toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
