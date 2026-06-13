'use client'

import { useEffect } from 'react'
import { useAppStore } from '@/store/useGlobalStore'

export default function StoreInitializer({ children }: { children: React.ReactNode }) {
  const initialize = useAppStore((state) => state.initialize)

  useEffect(() => {
    initialize()
  }, [initialize])

  return <>{children}</>
}
