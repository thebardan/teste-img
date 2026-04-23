'use client'
import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSession } from 'next-auth/react'
import { apiFetch } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'

export type NotificationType = 'SUBMITTED_FOR_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

export interface Notification {
  id: string
  type: NotificationType
  entityType: 'SalesSheet' | 'Presentation'
  entityId: string
  title: string
  message: string | null
  readAt: string | null
  createdAt: string
}

export function useNotifications(opts?: { unreadOnly?: boolean }) {
  return useQuery<{ items: Notification[] }>({
    queryKey: ['notifications', opts?.unreadOnly ? 'unread' : 'all'],
    queryFn: () =>
      apiFetch(`/notifications${opts?.unreadOnly ? '?unreadOnly=true' : ''}`),
    refetchInterval: false,
  })
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiFetch('/notifications/unread-count'),
    refetchInterval: false,
  })
}

export function useNotificationsStream() {
  const { data: session } = useSession()
  const qc = useQueryClient()
  const email = (session?.user as { email?: string })?.email

  useEffect(() => {
    if (!email) return
    const url = `${API_URL}/notifications/stream?email=${encodeURIComponent(email)}`
    const es = new EventSource(url)
    es.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data)
        if (data?.ping) return
        qc.invalidateQueries({ queryKey: ['notifications'] })
      } catch {
        /* ignore */
      }
    }
    es.onerror = () => {
      // EventSource auto-reconnects; nothing to do here.
    }
    return () => es.close()
  }, [email, qc])
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
