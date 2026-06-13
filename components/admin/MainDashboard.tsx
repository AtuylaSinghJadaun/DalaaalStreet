'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/useGlobalStore'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Users, Building2, TrendingUp, Power } from 'lucide-react'

export default function MainDashboard() {
  const { globalState, teams, companies, rounds } = useAppStore()

  const handlePhaseChange = async (newPhase: string) => {
    const { error } = await supabase.from('global_state').update({ current_phase: newPhase }).eq('id', 1)
    if (error) {
      toast.error('Failed to change phase: ' + error.message)
    } else {
      toast.success(`Phase changed to ${newPhase}`)
    }
  }

  const handleResetCompetition = async () => {
    if (!confirm('Are you SURE you want to reset the entire competition? This will wipe all portfolios, trades, and progress!')) return
    
    toast.info('Resetting competition...')
    try {
      // For safety, delete all trades, holdings, bids, inventory
      await Promise.all([
        supabase.from('trades').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('holdings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
        supabase.from('inventory').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      ])

      // Reset team balances and IPO participants
      const initialBalance = globalState?.initial_team_balance || 1000000
      await supabase.from('teams').update({ cash_balance: initialBalance, ipo_participant: false }).neq('id', '00000000-0000-0000-0000-000000000000')

      // Reset global state
      await supabase.from('global_state').update({ current_phase: 'waiting_for_ipo' }).eq('id', 1)

      toast.success('Competition successfully reset!')
    } catch (err: any) {
      toast.error('Reset failed: ' + err.message)
    }
  }

  const currentPhase = globalState?.current_phase || 'setup'
  
  const activeTeamsCount = teams.filter(t => !t.locked).length
  const ipoParticipantsCount = teams.filter(t => t.ipo_participant).length

  return (
    <div className="min-h-screen p-8 bg-background">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Command Center</h1>
          <p className="text-muted-foreground mt-1">Manage the DalaaalStreet live competition.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="px-4 py-2 bg-primary/20 text-primary font-bold rounded-lg uppercase tracking-wider text-sm border border-primary/50">
            Phase: {currentPhase.replace(/_/g, ' ')}
          </div>
          <Button variant="destructive" size="sm" onClick={handleResetCompetition}>
            <Power className="w-4 h-4 mr-2" />
            Reset Competition
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTeamsCount} / {teams.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {ipoParticipantsCount} participated in IPO
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies Listed</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{companies.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Rounds</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rounds.length}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Game Controls</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <Button 
            size="lg" 
            variant={currentPhase === 'waiting_for_ipo' ? 'default' : 'secondary'}
            onClick={() => handlePhaseChange('ipo')}
            disabled={currentPhase === 'ipo'}
          >
            Release IPO
          </Button>

          <Button 
            size="lg" 
            variant={currentPhase === 'ipo' ? 'default' : 'secondary'}
            onClick={() => handlePhaseChange('round_1')}
          >
            Start Round 1
          </Button>

          <Button 
            size="lg" 
            variant={currentPhase === 'round_1' ? 'default' : 'secondary'}
            onClick={() => handlePhaseChange('round_2')}
          >
            Start Round 2
          </Button>

          <Button 
            size="lg" 
            variant={currentPhase === 'round_2' ? 'default' : 'secondary'}
            onClick={() => handlePhaseChange('ended')}
          >
            End Game
          </Button>

          <Button 
            size="lg" 
            variant={currentPhase === 'ended' ? 'default' : 'secondary'}
            onClick={() => handlePhaseChange('auction')}
          >
            Activate Auction Phase
          </Button>
        </CardContent>
      </Card>

    </div>
  )
}
