'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface SyncStatus {
  isRunning: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  stats: {
    totalFolders: number
    matchedFolders: number
    unmatchedFolders: number
    totalImages: number
    syncedImages: number
  }
  lastError: string | null
}

export interface UnmatchedFolder {
  id: string
  driveId: string
  name: string
  matchScore: number | null
  suggestedProduct: { id: string; name: string; sku: string } | null
  imageCount: number
  createdAt: string
}

export function useDriveSyncStatus() {
  return useQuery<SyncStatus>({
    queryKey: ['drive-sync-status'],
    queryFn: () => apiFetch('/drive-sync/status'),
    refetchInterval: 5000,
  })
}

export function useUnmatchedFolders() {
  return useQuery<UnmatchedFolder[]>({
    queryKey: ['drive-sync-unmatched'],
    queryFn: () => apiFetch('/drive-sync/unmatched'),
  })
}

export function useTriggerSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => apiFetch('/drive-sync/trigger', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive-sync-status'] })
    },
  })
}

export function useLinkFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ folderId, productId }: { folderId: string; productId: string }) =>
      apiFetch(`/drive-sync/folders/${folderId}/link`, {
        method: 'POST',
        body: JSON.stringify({ productId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive-sync-unmatched'] })
      qc.invalidateQueries({ queryKey: ['drive-sync-status'] })
    },
  })
}

export function useRejectFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (folderId: string) =>
      apiFetch(`/drive-sync/folders/${folderId}/reject`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive-sync-unmatched'] })
      qc.invalidateQueries({ queryKey: ['drive-sync-status'] })
    },
  })
}
