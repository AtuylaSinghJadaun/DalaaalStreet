'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-background">
      <div className="w-64 bg-card border-r border-border p-4 flex flex-col gap-4 sticky top-0 h-screen">
        <h2 className="text-xl font-bold px-4 mb-4 text-primary">Mentor Portal</h2>
        <nav className="flex flex-col gap-2">
          <Link href="/admin/dashboard" className="px-4 py-2 hover:bg-secondary rounded-md transition-colors">Home Dashboard</Link>
          <Link href="/admin/auctions" className="px-4 py-2 hover:bg-secondary rounded-md transition-colors">Auctions Mgmt</Link>
          <Link href="/" className="px-4 py-2 hover:bg-secondary rounded-md transition-colors text-muted-foreground mt-8 text-sm">Participant View</Link>
        </nav>
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
