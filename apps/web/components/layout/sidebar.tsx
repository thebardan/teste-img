'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Layers, Presentation, Library,
  Package, CheckSquare, Image, FileSliders, Wand2, Activity, FolderSync,
} from 'lucide-react'

const navSections = [
  {
    label: 'Criar',
    items: [
      { href: '/sales-sheets', icon: Layers, label: 'Lâminas' },
      { href: '/presentations', icon: Presentation, label: 'Apresentações' },
    ],
  },
  {
    label: 'Biblioteca',
    items: [
      { href: '/library', icon: Library, label: 'Materiais' },
      { href: '/products', icon: Package, label: 'Produtos' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/brand-assets', icon: Image, label: 'Brand Assets' },
      { href: '/templates', icon: FileSliders, label: 'Templates' },
      { href: '/prompt-studio', icon: Wand2, label: 'Prompt Studio' },
      { href: '/approvals', icon: CheckSquare, label: 'Aprovações' },
      { href: '/jobs', icon: Activity, label: 'Jobs' },
      { href: '/drive-sync', icon: FolderSync, label: 'Google Drive' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-52 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-sm font-bold tracking-tight">Multi AI Studio</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm border-l-2 border-transparent text-muted-foreground hover:text-foreground transition-colors',
            pathname === '/dashboard' && 'border-primary text-primary bg-primary/5',
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        {navSections.map((section) => (
          <div key={section.label} className="mt-2">
            <p className="px-4 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
              {section.label}
            </p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm border-l-2 border-transparent text-muted-foreground hover:text-foreground transition-colors',
                  pathname.startsWith(item.href) && 'border-primary text-primary bg-primary/5',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
