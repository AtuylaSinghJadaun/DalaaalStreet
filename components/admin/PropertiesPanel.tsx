'use client'

import { useState } from 'react'
import { Building2, TrendingUp, Users } from 'lucide-react'
import CompaniesEditor from './CompaniesEditor'
import RoundsEditor from './RoundsEditor'
import TeamsEditor from './TeamsEditor'

const tabs = [
  { id: 'companies', label: 'Companies', icon: Building2 },
  { id: 'rounds', label: 'Rounds', icon: TrendingUp },
  { id: 'teams', label: 'Teams', icon: Users },
] as const

export default function PropertiesPanel() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]['id']>('companies')
  const activeIndex = tabs.findIndex((t) => t.id === activeTab)

  return (
    <div className="w-full space-y-8">
      {/* Header */}
      <div>
        <p className="eyebrow mb-2">Assets</p>
        <h1 className="text-3xl font-bold tracking-tight text-white">Properties</h1>
        <p className="mt-1.5 text-muted-foreground">Manage companies, rounds, and teams</p>
      </div>

      {/* Segmented control with a single sliding indicator */}
      <div
        role="tablist"
        aria-label="Properties sections"
        className="surface relative grid w-full max-w-md grid-cols-3 rounded-xl p-1"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-1 left-1 rounded-lg bg-white/[0.07] ring-1 ring-white/10 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]"
          style={{
            width: 'calc((100% - 0.5rem) / 3)',
            transform: `translateX(${activeIndex * 100}%)`,
          }}
        />
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-colors duration-200 ${
                isActive ? 'text-white' : 'text-muted-foreground hover:text-gray-300'
              }`}
            >
              <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div key={activeTab} className="animate-slide-in">
        {activeTab === 'companies' && <CompaniesEditor />}
        {activeTab === 'rounds' && <RoundsEditor />}
        {activeTab === 'teams' && <TeamsEditor />}
      </div>
    </div>
  )
}
