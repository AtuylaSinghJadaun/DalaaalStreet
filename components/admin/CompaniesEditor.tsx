'use client'

import { useState } from 'react'
import { useAppStore } from '@/store/useGlobalStore'
import { Pencil, Building2 } from 'lucide-react'
import CompanyEditDialog from './CompanyEditDialog'
import { Company } from '@/store/useGlobalStore'

export default function CompaniesEditor() {
  const { companies } = useAppStore()
  const [editingCompany, setEditingCompany] = useState<Company | null>(null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const handleEdit = (company: Company) => {
    setEditingCompany(company)
    setIsDialogOpen(true)
  }

  const handleClose = () => {
    setIsDialogOpen(false)
    setEditingCompany(null)
  }

  return (
    <div className="space-y-4">
      {companies.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <div
              key={company.id}
              className="surface surface-hover group flex h-full flex-col rounded-2xl p-5 transition-all duration-200"
            >
              {/* Header */}
              <div className="flex min-h-[2.75rem] items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-muted-foreground ring-1 ring-white/[0.06]">
                  <Building2 className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display truncate text-base font-semibold text-white">
                    {company.name}
                  </h3>
                  <p className="truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {company.industry}
                  </p>
                </div>
              </div>

              {/* Description — fixed slot keeps rows aligned */}
              <p className="line-clamp-2 min-h-[2.5rem] py-3 text-sm leading-relaxed text-muted-foreground">
                {company.description || 'No description provided'}
              </p>

              {/* Stats */}
              <div className="flex-1 space-y-2.5 border-t border-white/[0.06] pt-3">
                <div className="flex items-center justify-between">
                  <span className="eyebrow">IPO Price</span>
                  <span className="font-display text-sm font-semibold tabular-nums text-white">
                    ₹{company.ipo_price.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={() => handleEdit(company)}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-gray-200 transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary active:scale-[0.98]"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="surface rounded-2xl border-dashed p-12 text-center">
          <Building2 className="mx-auto mb-3 h-10 w-10 text-gray-600" />
          <p className="font-medium text-gray-300">No companies added yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Create companies to start trading</p>
        </div>
      )}

      <CompanyEditDialog company={editingCompany} isOpen={isDialogOpen} onClose={handleClose} />
    </div>
  )
}
