'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from './sidebar'
import { ChevronRight } from 'lucide-react'

const routeLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  'sales-sheets': 'Lâminas',
  presentations: 'Apresentações',
  library: 'Materiais',
  products: 'Produtos',
  'brand-assets': 'Brand Assets',
  templates: 'Templates',
  'prompt-studio': 'Prompt Studio',
  approvals: 'Aprovações',
  jobs: 'Jobs',
  'drive-sync': 'Google Drive',
}

function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) return null

  const crumbs = segments.map((seg, i) => {
    const href = '/' + segments.slice(0, i + 1).join('/')
    const label = routeLabels[seg] || decodeURIComponent(seg)
    const isLast = i === segments.length - 1
    return { href, label, isLast }
  })

  return (
    <nav className="flex items-center gap-1 text-caption">
      {crumbs.map((crumb, i) => (
        <span key={crumb.href} className="flex items-center gap-1">
          {i > 0 && <ChevronRight className="h-3 w-3 text-fg-tertiary" />}
          {crumb.isLast ? (
            <span className="font-medium text-fg">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="text-fg-tertiary hover:text-fg-secondary transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-canvas">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar — minimal, Apple-style */}
        <header className="flex h-12 shrink-0 items-center px-6 bg-surface">
          <Breadcrumbs />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
