'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useGlobalStore'
import SetupWizard from '@/components/admin/SetupWizard'
import MainDashboard from '@/components/admin/MainDashboard'

export default function AdminDashboard() {
  const router = useRouter()
  const { isInitialized, globalState, teams } = useAppStore()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const auth = localStorage.getItem('admin_auth')
      if (auth !== 'true') {
        router.replace('/admin')
      } else {
        setIsAuthenticated(true)
      }
    }
  }, [router])

  if (!isAuthenticated || !isInitialized) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  // Show setup wizard if the phase is still 'setup'
  if (globalState?.current_phase === 'setup') {
    return <SetupWizard />
  }

  return <MainDashboard />
}
