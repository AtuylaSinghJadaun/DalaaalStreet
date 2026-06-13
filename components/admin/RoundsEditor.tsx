'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useGlobalStore'
import { Pencil, TrendingUp, Plus } from 'lucide-react'
import RoundEditDialog from './RoundEditDialog'
import { Round } from '@/store/useGlobalStore'

export default function RoundsEditor() {
  const { rounds } = useAppStore()
  const [editingRound, setEditingRound] = useState<Round | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const handleEdit = (round: Round) => {
    setEditingRound(round)
    setIsCreating(false)
    setIsDialogOpen(true)
  }

  const handleCreateNew = () => {
    setEditingRound(null)
    setIsCreating(true)
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
    setEditingRound(null)
    setIsCreating(false)
  }

  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number)

  return (
    <div className="space-y-4">
      {/* Header with Add button */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-white">Market Rounds</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">Configure round settings and mean prices</p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex shrink-0 items-center gap-2 rounded-xl border border-primary/40 bg-primary/12 px-4 py-2.5 text-sm font-medium text-primary transition-all duration-200 hover:bg-primary/20 active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Add Round</span>
        </button>
      </div>

      {sortedRounds.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {sortedRounds.map((round) => (
            <div
              key={round.id}
              className="surface surface-hover group flex h-full flex-col rounded-2xl p-5 transition-all duration-200"
            >
              {/* Header */}
              <div className="flex min-h-[2.75rem] items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.06]">
                    <TrendingUp className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-display truncate text-base font-semibold text-white">
                      Round {round.round_number}
                    </h3>
                    {round.title && (
                      <p className="truncate text-sm text-muted-foreground">{round.title}</p>
                    )}
                  </div>
                </div>
                <span className={round.is_active ? 'pill pill-pos' : 'pill pill-muted'}>
                  {round.is_active && <span className="h-1.5 w-1.5 rounded-full bg-[#3ddc84]" />}
                  {round.is_active ? 'Live' : 'Idle'}
                </span>
              </div>

              {/* Event description — fixed slot */}
              <div className="my-4 flex-1 border-y border-white/[0.06] py-4">
                <p className="eyebrow mb-2">Market Event</p>
                <p className="line-clamp-3 text-sm leading-relaxed text-gray-300">
                  {round.event_description || 'No event description'}
                </p>
              </div>

              {/* Action */}
              <button
                onClick={() => handleEdit(round)}
                className="mt-auto flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-200 transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit Prices
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface rounded-2xl border-dashed p-12 text-center">
          <TrendingUp className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="font-medium text-gray-300">No rounds created yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create a market round to set mean prices</p>
        </div>
      )}

      <RoundEditDialog
        round={editingRound}
        isOpen={isDialogOpen}
        onClose={handleClose}
        isCreating={isCreating}
      />
    </div>
  )
}
