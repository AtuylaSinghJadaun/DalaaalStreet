'use client'

import { useState, useEffect } from 'react'
import { Round, RoundPrice, Company } from '@/store/useGlobalStore'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

interface RoundEditDialogProps {
  round: Round | null
  isOpen: boolean
  onClose: () => void
  isCreating?: boolean
}

interface RoundFormData {
  round: {
    id: string
    round_number: number
    title: string
    event_description: string
    is_active: boolean
  }
  prices: {
    company_id: string
    mean_price: number
  }[]
}

export default function RoundEditDialog({ round, isOpen, onClose, isCreating = false }: RoundEditDialogProps) {
  const { companies, rounds, roundPrices } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<RoundFormData | null>(null)

  useEffect(() => {
    if (isCreating) {
      // Create new round with default prices
      // Exclude the Endgame sentinel so a new round slots in sequentially
      // between the rounds and Endgame, not after the sentinel (9999).
      const playable = rounds.filter(r => r.round_number !== ENDGAME_ROUND_NUMBER)
      const maxRoundNumber = playable.length > 0 ? Math.max(...playable.map(r => r.round_number)) : 0
      const defaultPrices = companies.map(company => ({
        company_id: company.id,
        mean_price: company.ipo_price || 0,
      }))

      setFormData({
        round: {
          id: '',
          round_number: maxRoundNumber + 1,
          title: '',
          event_description: '',
          is_active: false,
        },
        prices: defaultPrices,
      })
    } else if (round) {
      // Load existing round with its prices
      const roundPricesForRound = roundPrices.filter(rp => rp.round_id === round.id)
      
      const prices = companies.map(company => {
        const existingPrice = roundPricesForRound.find(rp => rp.company_id === company.id)
        return {
          company_id: company.id,
          mean_price: existingPrice?.mean_price || company.ipo_price || 0,
        }
      })

      setFormData({
        round: {
          id: round.id,
          round_number: round.round_number,
          title: round.title,
          event_description: round.event_description,
          is_active: round.is_active,
        },
        prices,
      })
    }
  }, [round, isOpen, isCreating, companies, rounds, roundPrices])

  const handleRoundInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!formData) return
    const { name, value } = e.target
    setFormData({
      ...formData,
      round: {
        ...formData.round,
        [name]: name === 'round_number' ? parseInt(value) || 0 : value,
      },
    })
  }

  const handlePriceChange = (companyId: string, newPrice: number) => {
    if (!formData) return
    setFormData({
      ...formData,
      prices: formData.prices.map(p =>
        p.company_id === companyId ? { ...p, mean_price: newPrice } : p
      ),
    })
  }

  const handleSave = async () => {
    if (!formData) return

    setLoading(true)
    try {
      if (isCreating) {
        // Create new round
        const { data: newRound, error: roundError } = await supabase
          .from('rounds')
          .insert({
            round_number: formData.round.round_number,
            title: formData.round.title,
            event_description: formData.round.event_description,
            is_active: formData.round.is_active,
          })
          .select()
          .single()

        if (roundError) {
          toast.error('Failed to create round: ' + roundError.message)
          setLoading(false)
          return
        }

        // Create round prices for all companies
        const priceInserts = formData.prices.map(p => ({
          round_id: newRound.id,
          company_id: p.company_id,
          mean_price: p.mean_price,
        }))

        const { error: pricesError } = await supabase
          .from('round_prices')
          .insert(priceInserts)

        if (pricesError) {
          toast.error('Failed to set prices: ' + pricesError.message)
        } else {
          toast.success('Round created successfully with prices')
          onClose()
        }
      } else {
        // Update existing round
        const { error: roundError } = await supabase
          .from('rounds')
          .update({
            title: formData.round.title,
            event_description: formData.round.event_description,
            is_active: formData.round.is_active,
          })
          .eq('id', formData.round.id)

        if (roundError) {
          toast.error('Failed to update round: ' + roundError.message)
          setLoading(false)
          return
        }

        // Update or insert round prices
        for (const price of formData.prices) {
          const existingPrice = roundPrices.find(
            rp => rp.round_id === formData.round.id && rp.company_id === price.company_id
          )

          if (existingPrice) {
            const { error } = await supabase
              .from('round_prices')
              .update({ mean_price: price.mean_price })
              .eq('id', existingPrice.id)

            if (error) {
              toast.error(`Failed to update price for company: ${error.message}`)
              setLoading(false)
              return
            }
          } else {
            const { error } = await supabase
              .from('round_prices')
              .insert({
                round_id: formData.round.id,
                company_id: price.company_id,
                mean_price: price.mean_price,
              })

            if (error) {
              toast.error(`Failed to create price for company: ${error.message}`)
              setLoading(false)
              return
            }
          }
        }

        toast.success('Round updated successfully with new prices')
        onClose()
      }
    } catch (err: any) {
      toast.error('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto glass-card border border-purple-500/30 bg-black/50 shadow-2xl">
        <DialogHeader className="border-b border-purple-500/20 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            {isCreating ? 'Create Market Round' : `Edit Round ${formData?.round.round_number}`}
          </DialogTitle>
          <DialogDescription className="text-gray-400 mt-2">
            {isCreating
              ? 'Create a new round and configure mean prices for each company.'
              : 'Update round details and mean prices for trading.'}
          </DialogDescription>
        </DialogHeader>

        {formData && (
          <div className="space-y-6 py-4 max-h-[500px] overflow-y-auto">
            {/* Round Details */}
            <div className="space-y-4 border-b border-purple-500/20 pb-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-purple-300">Round Configuration</h3>

              <div className="space-y-2">
                <Label className="text-purple-300 font-semibold text-sm uppercase tracking-wider">Round Number</Label>
                <Input
                  id="round_number"
                  name="round_number"
                  type="number"
                  value={formData.round.round_number}
                  onChange={handleRoundInputChange}
                  disabled={!isCreating}
                  className={`border rounded-lg ${isCreating ? 'border-purple-500/30 bg-white/5 text-white' : 'border-gray-600/30 bg-gray-900/50 text-gray-500'} focus:border-purple-400`}
                />
                <p className="text-xs text-gray-400">
                  {isCreating ? 'Assign a unique round number' : 'Cannot be changed after creation'}
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-purple-300 font-semibold text-sm uppercase tracking-wider">Round Title</Label>
                <Input
                  id="title"
                  name="title"
                  value={formData.round.title}
                  onChange={handleRoundInputChange}
                  placeholder="e.g., Economic Boom"
                  className="bg-white/5 border border-purple-500/30 focus:border-purple-400 text-white placeholder:text-gray-500 rounded-lg"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-purple-300 font-semibold text-sm uppercase tracking-wider">News Headline <span className="text-gray-500 normal-case tracking-normal">(optional)</span></Label>
                <textarea
                  id="event_description"
                  name="event_description"
                  value={formData.round.event_description}
                  onChange={handleRoundInputChange}
                  placeholder="e.g. Tech stocks surge as AI demand explodes! Leave blank for no headline."
                  className="w-full px-3 py-2 bg-white/5 border border-purple-500/30 focus:border-purple-400 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
                  rows={3}
                />
                <p className="text-xs text-gray-400">
                  Typed out on participant screens & the big screen when this round begins. Leave empty to skip.
                </p>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  id="is_active"
                  name="is_active"
                  type="checkbox"
                  checked={formData.round.is_active}
                  onChange={(e) => {
                    if (!formData) return
                    setFormData({
                      ...formData,
                      round: {
                        ...formData.round,
                        is_active: e.target.checked,
                      },
                    })
                  }}
                  className="w-4 h-4 rounded border-purple-500/30 accent-purple-500"
                />
                <span className="text-purple-300 font-semibold text-sm">Mark as Active Phase</span>
              </label>
            </div>

            {/* Mean Prices */}
            <div className="space-y-4">
              <h3 className="font-bold text-sm uppercase tracking-widest text-green-300">Mean Prices</h3>
              <div className="space-y-3">
                {formData.prices.map((price) => {
                  const company = companies.find(c => c.id === price.company_id)
                  return (
                    <div key={price.company_id} className="glass-card border border-green-500/20 rounded-lg p-3 flex items-end gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white truncate">{company?.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">IPO: ₹{company?.ipo_price}</p>
                      </div>
                      <div className="w-32 flex-shrink-0">
                        <Label className="text-xs text-green-300 font-semibold">Mean Price</Label>
                        <Input
                          id={`price-${price.company_id}`}
                          type="number"
                          step="0.01"
                          value={price.mean_price || ''}
                          onChange={(e) => handlePriceChange(price.company_id, parseFloat(e.target.value) || 0)}
                          className="bg-white/5 border border-green-500/30 focus:border-green-400 text-white mt-1 rounded-lg"
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-purple-500/20 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 rounded-lg font-semibold transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {isCreating ? 'Creating...' : 'Saving...'}
              </>
            ) : isCreating ? (
              'Create Round'
            ) : (
              'Save Changes'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
