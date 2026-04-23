'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bell, CheckCircle2, XCircle, Send, Archive } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  type Notification,
} from '@/lib/hooks/use-notifications'

interface NotificationBellProps {
  collapsed: boolean
  unreadCount: number
}

const TYPE_ICON = {
  SUBMITTED_FOR_REVIEW: Send,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  ARCHIVED: Archive,
} as const

const TYPE_COLOR = {
  SUBMITTED_FOR_REVIEW: 'text-warning',
  APPROVED: 'text-success',
  REJECTED: 'text-danger',
  ARCHIVED: 'text-fg-tertiary',
} as const

function entityLink(n: Notification) {
  if (n.entityType === 'SalesSheet') return `/sales-sheets/${n.entityId}`
  if (n.entityType === 'Presentation') return `/presentations/${n.entityId}`
  return '/'
}

export function NotificationBell({ collapsed, unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false)
  const { data } = useNotifications()
  const { mutateAsync: markRead } = useMarkNotificationRead()
  const { mutateAsync: markAll, isPending: markingAll } = useMarkAllNotificationsRead()

  const items = data?.items ?? []

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        title={collapsed ? `Notificações${unreadCount > 0 ? ` (${unreadCount})` : ''}` : undefined}
        className={cn(
          'relative flex w-full items-center gap-2 px-3 py-1.5 text-micro text-white/60 hover:text-white/90 hover:bg-white/[0.06] transition-colors duration-200 rounded-micro',
          collapsed && 'justify-center',
        )}
      >
        <Bell className="h-4 w-4 shrink-0" />
        {!collapsed && <span>Notificações</span>}
        {unreadCount > 0 && (
          <span
            className={cn(
              'absolute top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white',
              collapsed ? 'right-0.5' : 'right-2',
            )}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute bottom-full left-full z-50 mb-0 ml-2 w-80 rounded-standard border border-border bg-surface shadow-elevated">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="text-caption font-medium">Notificações</p>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAll()}
                  disabled={markingAll}
                  className="text-micro text-accent hover:underline disabled:opacity-50"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>
            <div className="max-h-96 overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-3 py-8 text-center text-caption text-fg-tertiary">
                  Nenhuma notificação
                </p>
              ) : (
                items.map((n) => {
                  const Icon = TYPE_ICON[n.type] ?? Bell
                  const color = TYPE_COLOR[n.type] ?? 'text-fg-tertiary'
                  const unread = !n.readAt
                  return (
                    <Link
                      key={n.id}
                      href={entityLink(n)}
                      onClick={() => {
                        if (unread) markRead(n.id).catch(() => {})
                        setOpen(false)
                      }}
                      className={cn(
                        'flex items-start gap-2 border-b border-border/50 px-3 py-2 transition-colors last:border-0',
                        unread ? 'bg-accent/[0.04] hover:bg-accent/[0.08]' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                      )}
                    >
                      <Icon className={cn('mt-0.5 h-4 w-4 shrink-0', color)} />
                      <div className="min-w-0 flex-1">
                        <p className={cn('text-caption', unread ? 'font-medium' : 'text-fg-secondary')}>
                          {n.title}
                        </p>
                        {n.message && (
                          <p className="mt-0.5 line-clamp-2 text-micro text-fg-tertiary">
                            {n.message}
                          </p>
                        )}
                        <p className="mt-0.5 text-nano text-fg-tertiary">
                          {new Date(n.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                      {unread && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />}
                    </Link>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
