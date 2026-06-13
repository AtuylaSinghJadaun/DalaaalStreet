'use client'

import { ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Zap, LayoutDashboard, SlidersHorizontal, Gavel, ArrowLeft } from 'lucide-react'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/properties', label: 'Properties', icon: SlidersHorizontal },
  { href: '/admin/auctions', label: 'Auctions', icon: Gavel },
]

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const isLoginPage = pathname === '/admin'

  if (isLoginPage) {
    return <>{children}</>
  }

  return (
    // Background is owned by <body> — layout stays transparent for one backdrop.
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Mobile top bar */}
      <header className="glass sticky top-0 z-30 flex items-center gap-2 border-b border-white/[0.06] px-4 py-3 md:hidden">
        <div className="mr-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/30">
          <Zap className="h-4 w-4 text-primary" />
        </div>
        <nav className="flex flex-1 items-center gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  isActive
                    ? 'bg-primary/12 text-white ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </header>

      {/* Desktop sidebar */}
      <aside className="glass sticky top-0 hidden h-screen w-64 flex-col gap-8 overflow-y-auto border-r border-white/[0.06] p-5 md:flex">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/15 ring-1 ring-primary/30">
            <Zap className="h-4.5 w-4.5 text-primary" />
          </div>
          <div className="leading-tight">
            <h2 className="font-display text-base font-semibold text-white">Mentor Portal</h2>
            <p className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
              Command Center
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-primary/12 text-white ring-1 ring-primary/25'
                    : 'text-muted-foreground hover:bg-white/[0.04] hover:text-white'
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 ${
                    isActive ? 'text-primary' : 'text-gray-500 group-hover:text-gray-300'
                  }`}
                />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <Link
          href="/"
          className="mt-auto flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-gray-500 transition-colors hover:bg-white/[0.04] hover:text-gray-300"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Game
        </Link>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  )
}
