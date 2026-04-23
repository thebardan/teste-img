'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface ArtResult {
  artImageUrl: string
  artImageKey: string
}

export function useGenerateArt() {
  const qc = useQueryClient()
  return useMutation<ArtResult, Error, { salesSheetId: string; prompt?: string }>({
    mutationFn: ({ salesSheetId, prompt }) =>
      apiFetch(`/sales-sheets/${salesSheetId}/generate-art`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-sheet', vars.salesSheetId] })
    },
  })
}

export function useGenerateArtBatch() {
  const qc = useQueryClient()
  return useMutation<ArtResult[], Error, { salesSheetId: string; count?: number; prompt?: string }>({
    mutationFn: ({ salesSheetId, count, prompt }) =>
      apiFetch(`/sales-sheets/${salesSheetId}/generate-art-batch`, {
        method: 'POST',
        body: JSON.stringify({ count: count ?? 3, prompt }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-sheet', vars.salesSheetId] })
    },
  })
}

import { useQuery } from '@tanstack/react-query'

export interface ArtJob {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  entityId: string
  payload: {
    count: number
    refinementPrompt: string | null
    results: ArtResult[]
  }
  error: string | null
  startedAt: string | null
  completedAt: string | null
  createdAt: string
}

export function useEnqueueArtBatch() {
  return useMutation<{ jobId: string }, Error, { salesSheetId: string; count?: number; prompt?: string }>({
    mutationFn: ({ salesSheetId, count, prompt }) =>
      apiFetch(`/sales-sheets/${salesSheetId}/generate-art-batch-async`, {
        method: 'POST',
        body: JSON.stringify({ count: count ?? 3, prompt }),
      }),
  })
}

export function useArtJob(jobId: string | null) {
  return useQuery<ArtJob>({
    queryKey: ['art-job', jobId],
    queryFn: () => apiFetch(`/sales-sheets/art-jobs/${jobId}`),
    enabled: !!jobId,
    refetchInterval: (q) => {
      const s = q.state.data?.status
      return s === 'COMPLETED' || s === 'FAILED' || s === 'CANCELLED' ? false : 2000
    },
  })
}
