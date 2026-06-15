'use client'

import { useState, useEffect } from 'react'
import { Team } from '@/store/useGlobalStore'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, RotateCw } from 'lucide-react'

interface TeamEditDialogProps {
  team: Team | null
  isOpen: boolean
  onClose: () => void
}

export default function TeamEditDialog({ team, isOpen, onClose }: TeamEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Team | null>(null)

  useEffect(() => {
    if (team) {
      setFormData(team)
    }
  }, [team, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === 'cash_balance' ? parseFloat(value) || 0 : value,
    })
  }

  const handleSave = async () => {
    if (!formData) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('teams')
        .update({
          name: formData.name,
          cash_balance: formData.cash_balance,
          locked: formData.locked,
        })
        .eq('id', formData.id)

      if (error) {
        toast.error('Failed to update team: ' + error.message)
      } else {
        toast.success('Team updated successfully')
        onClose()
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetTeamCode = async () => {
    if (!formData) return
    if (!confirm('Generate a new team code? Old code will no longer work.')) return

    setLoading(true)
    try {
      const newCode = Math.random().toString(36).substring(2, 8).toUpperCase()
      const { error } = await supabase
        .from('teams')
        .update({ team_code: newCode })
        .eq('id', formData.id)

      if (error) {
        toast.error('Failed to reset team code: ' + error.message)
      } else {
        setFormData({
          ...formData,
          team_code: newCode,
        })
        toast.success('Team code reset to: ' + newCode)
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] glass-card border border-green-500/30 bg-black/50 shadow-2xl">
        <DialogHeader className="border-b border-green-500/20 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
            Edit Team
          </DialogTitle>
          <DialogDescription className="text-gray-400 mt-2">
            Update team details including balance and participation status.
          </DialogDescription>
        </DialogHeader>

        {formData && (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="team_number">Team Number</Label>
              <Input
                id="team_number"
                name="team_number"
                type="number"
                value={formData.team_number}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Team number cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="team_code">Team Code</Label>
              <div className="flex gap-2">
                <Input
                  id="team_code"
                  name="team_code"
                  value={formData.team_code}
                  disabled
                  className="bg-muted font-mono font-bold flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetTeamCode}
                  disabled={loading}
                >
                  <RotateCw className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Click the refresh icon to generate a new code
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cash_balance">Cash Balance (₹)</Label>
              <Input
                id="cash_balance"
                name="cash_balance"
                type="number"
                step="1000"
                value={formData.cash_balance || ''}
                onChange={handleInputChange}
                className="bg-background"
              />
            </div>

            <div className="space-y-2">
              <Label>
                <input
                  type="checkbox"
                  checked={formData.locked}
                  onChange={(e) => {
                    if (!formData) return
                    setFormData({
                      ...formData,
                      locked: e.target.checked,
                    })
                  }}
                  className="mr-2"
                />
                Locked Status
              </Label>
              <p className="text-xs text-muted-foreground">
                Locked teams cannot participate or log in
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
