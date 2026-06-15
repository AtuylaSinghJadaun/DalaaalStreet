'use client'

import { useState, useEffect } from 'react'
import { useAppStore, ENDGAME_ROUND_NUMBER } from '@/store/useGlobalStore'
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'

interface SpecialPriceDialogProps {
  mode: 'ipo' | 'endgame'
  isOpen: boolean
  onClose: () => void
}

interface PriceRow {
  company_id: string
  price: number
}

export default function SpecialPriceDialog({ mode, isOpen, onClose }: SpecialPriceDialogProps) {
  const { companies, rounds, roundPrices } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [prices, setPrices] = useState<PriceRow[]>([])

  // The endgame price set lives on a sentinel round.
  const endgameRound = rounds.find(r => r.round_number === ENDGAME_ROUND_NUMBER)

  useEffect(() => {
    if (!isOpen) return
    if (mode === 'ipo') {
      setPrices(companies.map(c => ({ company_id: c.id, price: c.ipo_price || 0 })))
    } else {
      setPrices(
        companies.map(c => {
          const existing = endgameRound
            ? roundPrices.find(rp => rp.round_id === endgameRound.id && rp.company_id === c.id)
            : undefined
          return { company_id: c.id, price: existing?.mean_price ?? c.ipo_price ?? 0 }
        })
      )
    }
  }, [isOpen, mode, companies, roundPrices, endgameRound])

  const handlePriceChange = (companyId: string, newPrice: number) => {
    setPrices(prev => prev.map(p => (p.company_id === companyId ? { ...p, price: newPrice } : p)))
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      if (mode === 'ipo') {
        for (const row of prices) {
          const { error } = await supabase
            .from('companies')
            .update({ ipo_price: row.price })
            .eq('id', row.company_id)
          if (error) {
            toast.error('Failed to save IPO price: ' + error.message)
            setLoading(false)
            return
          }
        }
        toast.success('IPO prices updated')
        onClose()
        return
      }

      // Endgame: ensure the sentinel round exists, then upsert its prices.
      let roundId = endgameRound?.id
      if (!roundId) {
        const { data: newRound, error: roundError } = await supabase
          .from('rounds')
          .insert({
            round_number: ENDGAME_ROUND_NUMBER,
            title: 'Endgame',
            event_description: 'Final liquidation prices used when the game ends.',
            is_active: false,
          })
          .select()
          .single()
        if (roundError || !newRound) {
          toast.error('Failed to create Endgame: ' + (roundError?.message || 'unknown error'))
          setLoading(false)
          return
        }
        roundId = newRound.id
      }

      for (const row of prices) {
        const existing = roundPrices.find(
          rp => rp.round_id === roundId && rp.company_id === row.company_id
        )
        if (existing) {
          const { error } = await supabase
            .from('round_prices')
            .update({ mean_price: row.price })
            .eq('id', existing.id)
          if (error) {
            toast.error('Failed to save Endgame price: ' + error.message)
            setLoading(false)
            return
          }
        } else {
          const { error } = await supabase
            .from('round_prices')
            .insert({ round_id: roundId, company_id: row.company_id, mean_price: row.price })
          if (error) {
            toast.error('Failed to save Endgame price: ' + error.message)
            setLoading(false)
            return
          }
        }
      }
      toast.success('Endgame prices updated')
      onClose()
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const isIpo = mode === 'ipo'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto glass-card border border-white/20 bg-black/50 shadow-2xl">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="text-2xl font-bold text-white">
            {isIpo ? 'Edit IPO Prices' : 'Edit Endgame Prices'}
          </DialogTitle>
          <DialogDescription className="text-gray-400 mt-2">
            {isIpo
              ? 'Set the starting (IPO) price for each company.'
              : 'Set the final liquidation price for each company, used when the game ends.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4 max-h-[500px] overflow-y-auto">
          {prices.map(row => {
            const company = companies.find(c => c.id === row.company_id)
            return (
              <div key={row.company_id} className="glass-card border border-white/10 rounded-lg p-3 flex items-end gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{company?.name}</p>
                  {!isIpo && <p className="text-xs text-gray-400 mt-0.5">IPO: ₹{company?.ipo_price}</p>}
                </div>
                <div className="w-32 flex-shrink-0">
                  <Label className="text-xs text-gray-300 font-semibold">{isIpo ? 'IPO Price' : 'Final Price'}</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={row.price || ''}
                    onChange={e => handlePriceChange(row.company_id, parseFloat(e.target.value) || 0)}
                    className="bg-white/5 border border-white/20 focus:border-white/40 text-white mt-1 rounded-lg"
                  />
                </div>
              </div>
            )
          })}
          {prices.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No companies configured yet.</p>
          )}
        </div>

        <DialogFooter className="border-t border-white/10 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 rounded-lg font-semibold transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || prices.length === 0}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
