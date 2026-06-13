'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useGlobalStore'
import { Pencil, Users, Lock, Check, X } from 'lucide-react'
import TeamEditDialog from './TeamEditDialog'
import { Team } from '@/store/useGlobalStore'

export default function TeamsEditor() {
  const { teams } = useAppStore()
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleEdit = (team: Team) => {
    setEditingTeam(team)
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
    setEditingTeam(null)
  }

  const sortedTeams = [...teams].sort((a, b) => a.team_number - b.team_number)

  return (
    <div className="space-y-4">
      {teams.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedTeams.map((team) => (
            <div
              key={team.id}
              className="surface surface-hover group flex h-full flex-col rounded-2xl p-5 transition-all duration-200"
            >
              {/* Header — fixed slot so the pill never shifts card height */}
              <div className="flex min-h-[2.75rem] items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.06]">
                    {team.locked ? <Lock className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display truncate text-base font-semibold text-white">
                      Team {team.team_number}
                    </h3>
                    <p className="truncate text-sm text-muted-foreground">{team.name}</p>
                  </div>
                </div>
                <span className={team.locked ? 'pill pill-neg' : 'pill pill-pos'}>
                  {team.locked ? 'Locked' : 'Active'}
                </span>
              </div>

              {/* Stats */}
              <div className="my-4 space-y-2.5 border-y border-white/[0.06] py-4">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Code</span>
                  <span className="font-mono text-sm font-semibold tracking-wider text-gray-200">
                    {team.team_code}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="eyebrow">Balance</span>
                  <span className="font-display text-base font-semibold tabular-nums text-[#76e9a8]">
                    ₹{(team.cash_balance / 1000000).toFixed(1)}M
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="eyebrow">IPO</span>
                  <span className={team.ipo_participant ? 'pill pill-pos' : 'pill pill-muted'}>
                    {team.ipo_participant ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                    {team.ipo_participant ? 'In' : 'Out'}
                  </span>
                </div>
              </div>

              {/* Action — mt-auto keeps every Edit button on the same baseline */}
              <button
                onClick={() => handleEdit(team)}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-200 transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface rounded-2xl border-dashed p-12 text-center">
          <Users className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="font-medium text-gray-300">No teams created yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Teams will appear here once created</p>
        </div>
      )}

      <TeamEditDialog team={editingTeam} isOpen={isDialogOpen} onClose={handleClose} />
    </div>
  )
}
