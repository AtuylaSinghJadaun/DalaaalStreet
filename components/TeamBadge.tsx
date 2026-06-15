'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { useAppStore } from '@/store/useGlobalStore'
import { Users } from 'lucide-react'

/**
 * Permanent top-right badge showing the logged-in team. Mounted globally but
 * only renders on participant pages (not the admin console or the big screen)
 * and only once a team session exists.
 */
export default function TeamBadge() {
  const pathname = usePathname()
  const { teams } = useAppStore()
  const [teamId, setTeamId] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setTeamId(localStorage.getItem('team_id'))
    }
  }, [pathname])

  if (pathname?.startsWith('/admin') || pathname?.startsWith('/stage')) return null

  const team = teams.find(t => t.id === teamId)
  if (!team) return null

  return (
    <div className="fixed right-4 top-4 z-40 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 shadow-lg backdrop-blur-xl">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
        <Users className="h-4 w-4 text-primary" />
      </div>
      <div className="leading-tight">
        <p className="text-[0.6rem] font-bold uppercase tracking-widest text-muted-foreground">Your Team</p>
        <p className="font-display text-sm font-bold text-white">
          Team {team.team_number}
        </p>
      </div>
    </div>
  )
}
