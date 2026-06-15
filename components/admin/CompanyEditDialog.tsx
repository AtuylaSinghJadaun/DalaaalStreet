'use client'

import { useState, useEffect } from 'react'
import { Company } from '@/store/useGlobalStore'
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
import { Loader2 } from 'lucide-react'

interface CompanyEditDialogProps {
  company: Company | null
  isOpen: boolean
  onClose: () => void
}

export default function CompanyEditDialog({ company, isOpen, onClose }: CompanyEditDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<Company | null>(null)

  useEffect(() => {
    if (company) {
      setFormData(company)
    }
  }, [company, isOpen])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!formData) return
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name.includes('price') || name.includes('valuation') || name.includes('shares')
        ? parseFloat(value) || 0
        : value,
    })
  }

  const handleSave = async () => {
    if (!formData) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          name: formData.name,
          description: formData.description,
          industry: formData.industry,
          logo_url: formData.logo_url,
          ipo_price: formData.ipo_price,
          available_shares: formData.available_shares,
          initial_valuation: formData.initial_valuation,
        })
        .eq('id', formData.id)

      if (error) {
        toast.error('Failed to update company: ' + error.message)
      } else {
        toast.success('Company updated successfully')
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
      <DialogContent className="sm:max-w-[550px] glass-card border border-cyan-500/30 bg-black/50 shadow-2xl">
        <DialogHeader className="border-b border-cyan-500/20 pb-4">
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
            Edit Company
          </DialogTitle>
          <DialogDescription className="text-gray-400 mt-2">
            Update company details. Changes persist in real-time.
          </DialogDescription>
        </DialogHeader>

        {formData && (
          <div className="space-y-4 py-4 max-h-[500px] overflow-y-auto">
            <div className="space-y-2">
              <Label className="text-cyan-300 font-semibold text-sm uppercase tracking-wider">Company Name</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="bg-white/5 border border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-cyan-300 font-semibold text-sm uppercase tracking-wider">Description</Label>
              <Input
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="bg-white/5 border border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-cyan-300 font-semibold text-sm uppercase tracking-wider">Industry</Label>
              <Input
                id="industry"
                name="industry"
                value={formData.industry}
                onChange={handleInputChange}
                className="bg-white/5 border border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-cyan-300 font-semibold text-sm uppercase tracking-wider">IPO Price (₹)</Label>
                <Input
                  id="ipo_price"
                  name="ipo_price"
                  type="number"
                  step="0.01"
                  value={formData.ipo_price || ''}
                  onChange={handleInputChange}
                  className="bg-white/5 border border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-cyan-300 font-semibold text-sm uppercase tracking-wider">Shares</Label>
                <Input
                  id="available_shares"
                  name="available_shares"
                  type="number"
                  value={formData.available_shares || ''}
                  onChange={handleInputChange}
                  className="bg-white/5 border border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-gray-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-cyan-300 font-semibold text-sm uppercase tracking-wider">Initial Valuation (₹)</Label>
              <Input
                id="initial_valuation"
                name="initial_valuation"
                type="number"
                value={formData.initial_valuation || ''}
                onChange={handleInputChange}
                className="bg-white/5 border border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-gray-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-cyan-300 font-semibold text-sm uppercase tracking-wider">Logo URL</Label>
              <Input
                id="logo_url"
                name="logo_url"
                value={formData.logo_url}
                onChange={handleInputChange}
                className="bg-white/5 border border-cyan-500/30 focus:border-cyan-400 text-white placeholder:text-gray-500"
                placeholder="https://example.com/logo.png"
              />
            </div>
          </div>
        )}

        <DialogFooter className="border-t border-cyan-500/20 pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700/50 hover:bg-gray-700/70 text-gray-300 rounded-lg font-semibold transition-all duration-300"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-semibold transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
