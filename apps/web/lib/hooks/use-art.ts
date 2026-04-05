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
