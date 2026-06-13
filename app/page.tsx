'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useGlobalStore'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

export default function ParticipantLogin() {
  const [teamCode, setTeamCode] = useState('')
  const router = useRouter()
  const { teams, globalState, isInitialized } = useAppStore()

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTeamId = localStorage.getItem('team_id')
      if (savedTeamId && isInitialized && globalState) {
        redirectBasedOnPhase(globalState.current_phase)
      }
    }
  }, [isInitialized, globalState, router])

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

    if (team.locked) {
      toast.error('Your team is locked out of the competition.')
      return
    }

    // Mark as IPO participant if logging in before round 1
    if (globalState && ['setup', 'waiting_for_ipo', 'ipo'].includes(globalState.current_phase)) {
      if (!team.ipo_participant) {
        await supabase.from('teams').update({ ipo_participant: true }).eq('id', team.id)
      }
    } else {
      // Trying to login after Round 1 started
      if (!team.ipo_participant) {
        await supabase.from('teams').update({ locked: true }).eq('id', team.id)
        toast.error('You did not participate in the IPO. Your team is locked out.')
        return
      }
    }

    localStorage.setItem('team_id', team.id)
    toast.success(`Welcome, ${team.name}!`)
    if (globalState) {
      redirectBasedOnPhase(globalState.current_phase)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md border-border bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-4 border border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)]">
            <span className="text-2xl font-bold text-primary">₹</span>
          </div>
          <CardTitle className="text-3xl font-black tracking-tighter uppercase">DalaaalStreet</CardTitle>
          <CardDescription className="text-lg">Enter your Team Code to join the market</CardDescription>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="e.g. 123456"
              value={teamCode}
              onChange={(e) => setTeamCode(e.target.value)}
              required
              className="text-center text-2xl tracking-[0.5em] font-mono h-14 bg-background"
              maxLength={6}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full h-12 text-lg font-bold uppercase tracking-wider">
              Enter Market
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
