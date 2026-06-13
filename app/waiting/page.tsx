'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/useGlobalStore'
import { Loader2 } from 'lucide-react'

export default function WaitingRoom() {
  const router = useRouter()
  const { globalState } = useAppStore()

  useEffect(() => {
    if (globalState && globalState.current_phase === 'ipo') {
      router.push('/ipo')
    }
  }, [globalState, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background text-foreground">
      <div className="flex flex-col items-center space-y-6 text-center animate-pulse">
        <div className="w-24 h-24 bg-primary/20 rounded-full flex items-center justify-center border border-primary/50 shadow-[0_0_30px_rgba(var(--primary),0.5)]">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
        </div>
        <h1 className="text-4xl font-black tracking-tight uppercase">Waiting for IPO Release...</h1>
        <p className="text-xl text-muted-foreground max-w-md">
          Get ready! The market opens soon. Make sure to strategize with your team before the Initial Public Offerings go live.
        </p>
      </div>
    </div>
  )
}
