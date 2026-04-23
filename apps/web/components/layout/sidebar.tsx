'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { useUnreadCount } from '@/lib/hooks/use-notifications'
import { NotificationBell } from '@/components/notifications/notification-bell'
import {
  LayoutDashboard, Layers, Presentation, Library,
  Package, CheckSquare, Image, FileSliders, Wand2, Activity, FolderSync,
  PanelLeftClose, PanelLeft, LogOut,
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
  const [collapsed, setCollapsed] = useState(false)
  const { data: unread } = useUnreadCount()
  const unreadCount = unread?.count ?? 0

  return (
    <aside
      className={cn(
        'flex h-full flex-col glass-nav text-white transition-all duration-300 ease-in-out',
        collapsed ? 'w-[56px]' : 'w-52'
      )}
    >
      {/* Logo */}
      <div className="flex h-12 items-center justify-between px-3">
        <Link href="/dashboard" className="flex items-center gap-2 overflow-hidden">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="currentColor">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          {!collapsed && (
            <span className="text-micro font-semibold tracking-tight whitespace-nowrap opacity-90">
              Multi AI Studio
            </span>
          )}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="rounded-micro p-1 text-white/40 hover:text-white/80 transition-colors shrink-0"
        >
          {collapsed ? <PanelLeft className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-1.5">
        <NavItem
          href="/dashboard"
          icon={LayoutDashboard}
          label="Dashboard"
          active={pathname === '/dashboard'}
          collapsed={collapsed}
        />

        {navSections.map((section) => (
          <div key={section.label} className="mt-3">
            {!collapsed && (
              <p className="px-3 py-1 text-nano font-semibold uppercase tracking-widest text-white/30">
                {section.label}
              </p>
            )}
            {collapsed && <div className="mx-3 my-1 border-t border-white/10" />}
            {section.items.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                active={pathname.startsWith(item.href)}
                collapsed={collapsed}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Notifications + Logout */}
      <div className="border-t border-white/10 p-1 space-y-0.5">
        <NotificationBell collapsed={collapsed} unreadCount={unreadCount} />
        <button
          onClick={() => signOut({ callbackUrl: '/auth/signin' })}
          title={collapsed ? 'Sair' : undefined}
          className={cn(
            'flex w-full items-center gap-2 px-3 py-1.5 text-micro text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors duration-200 mx-0 rounded-micro',
            collapsed && 'justify-center',
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </aside>
  )
}

function NavItem({
  href,
  icon: Icon,
  label,
  active,
  collapsed,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  collapsed: boolean
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 text-micro transition-colors duration-200 mx-1 rounded-micro',
        collapsed && 'justify-center',
        active
          ? 'bg-white/[0.12] text-white font-medium'
          : 'text-white/60 hover:text-white/90 hover:bg-white/[0.06]',
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  )
}
