'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore, ENDGAME_ROUND_NUMBER } from '@/store/useGlobalStore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip } from 'recharts'

export default function EndedRoom() {
  const router = useRouter()
  const { globalState, teams, holdings, companies, roundPrices, rounds, isInitialized } = useAppStore()
  const [teamId, setTeamId] = useState<string | null>(null)

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
    if (globalState?.current_phase === 'auction') {
      router.push('/auction')
    } else if (globalState && globalState.current_phase !== 'ended') {
      router.push('/')
    }
  }, [globalState, router])

  const myTeam = teams.find(t => t.id === teamId)
  if (!myTeam) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background text-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">
          {isInitialized ? 'Loading your session…' : 'Connecting…'}
        </p>
      </div>
    )
  }

  // Determine final prices. Prefer the dedicated Endgame price set; otherwise
  // fall back to the last played round.
  const playableRounds = rounds.filter(r => r.round_number !== ENDGAME_ROUND_NUMBER)
  const endgameRound = rounds.find(r => r.round_number === ENDGAME_ROUND_NUMBER)
  const lastPlayedRound = playableRounds.length
    ? playableRounds.reduce((a, b) => (a.round_number > b.round_number ? a : b))
    : undefined
  const finalRound = endgameRound || lastPlayedRound

  const getCompanyFinalPrice = (companyId: string) => {
    if (!finalRound) return 0
    const priceRecord = roundPrices.find(rp => rp.round_id === finalRound.id && rp.company_id === companyId)
    return priceRecord ? priceRecord.mean_price : 0
  }

  // Full price history per company: IPO price, then every played round's mean
  // price, ending at the Endgame (final liquidation) price.
  const getCompanyPriceHistory = (companyId: string) => {
    const company = companies.find(c => c.id === companyId)
    const series: { label: string; price: number }[] = [
      { label: 'IPO', price: company?.ipo_price || 0 }
    ]
    ;[...playableRounds]
      .sort((a, b) => a.round_number - b.round_number)
      .forEach(r => {
        const priceRecord = roundPrices.find(rp => rp.round_id === r.id && rp.company_id === companyId)
        if (priceRecord) series.push({ label: `Round ${r.round_number}`, price: priceRecord.mean_price })
      })
    if (endgameRound) {
      const endPrice = roundPrices.find(rp => rp.round_id === endgameRound.id && rp.company_id === companyId)
      if (endPrice) series.push({ label: 'Endgame', price: endPrice.mean_price })
    }
    return series
  }

  // Calculate final leaderboards
  // For each team, Net Worth = Cash + sum(holding.qty * finalPrice)
  const leaderboard = teams.filter(t => {
    // Every active (non-locked) team belongs on the final leaderboard. A team
    // that sold all its shares still has a cash balance (its net worth), so we
    // must not filter on holdings or IPO participation.
    return !t.locked
  }).map(team => {
    // Holdings were liquidated into cash_balance when the game ended, so the
    // stored balance is the final net worth.
    const teamHoldings = holdings.filter(h => h.team_id === team.id)
    const portfolioValue = teamHoldings.reduce((sum, h) => sum + (h.quantity * getCompanyFinalPrice(h.company_id)), 0)
    const netWorth = team.cash_balance
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

      <Card className="bg-card border-border shadow-md mb-8">
        <CardHeader>
          <CardTitle>Stock Price History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {companies.map(company => {
              const history = getCompanyPriceHistory(company.id)
              const finalPrice = getCompanyFinalPrice(company.id)
              const firstPrice = history[0]?.price || 0
              const isUp = finalPrice >= firstPrice
              const color = isUp ? '#22c55e' : '#ff5470'
              return (
                <div key={company.id} className="p-4 rounded-lg bg-secondary/30 border border-border/50">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-bold">{company.name}</h3>
                    <span className="font-mono font-bold text-lg" style={{ color }}>₹{finalPrice.toFixed(2)}</span>
                  </div>
                  <div className="h-[180px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={history} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <YAxis domain={['dataMin - 5', 'dataMax + 5']} tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                        <Tooltip
                          contentStyle={{
                            background: 'var(--card)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.5rem',
                            fontSize: '0.8rem'
                          }}
                          formatter={(value: any) => [`₹${Number(value).toFixed(2)}`, 'Price']}
                        />
                        <Line type="monotone" dataKey="price" stroke={color} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

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
