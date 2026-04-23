'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

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
    refetchInterval: 60_000,
  })
}

export function useUnreadCount() {
  return useQuery<{ count: number }>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => apiFetch('/notifications/unread-count'),
    refetchInterval: 30_000,
  })
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
