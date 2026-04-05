'use client'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface ExportedArtifact {
  id: string
  type: 'PNG' | 'JPEG' | 'PDF' | 'PPTX'
  filename: string
  sizeBytes: number | null
  storageKey: string
  createdAt: string
}

export interface ExportResult {
  artifact: ExportedArtifact
  downloadUrl: string
}

export function useExportPresentationPptx() {
  return useMutation<ExportResult, Error, string>({
    mutationFn: (id) => apiFetch(`/exports/presentation/${id}/pptx`, { method: 'POST' }),
  })
}

export function useExportPresentationPdf() {
  return useMutation<ExportResult, Error, string>({
    mutationFn: (id) => apiFetch(`/exports/presentation/${id}/pdf`, { method: 'POST' }),
  })
}

export function useExportSalesSheetPdf() {
  return useMutation<ExportResult, Error, string>({
    mutationFn: (id) => apiFetch(`/exports/sales-sheet/${id}/pdf`, { method: 'POST' }),
  })
}

export function usePresentationArtifacts(presentationId: string) {
  return useQuery<ExportedArtifact[]>({
    queryKey: ['artifacts', 'presentation', presentationId],
    queryFn: () => apiFetch(`/exports/presentation/${presentationId}/artifacts`),
    enabled: !!presentationId,
  })
}

export function useSalesSheetArtifacts(salesSheetId: string) {
  return useQuery<ExportedArtifact[]>({
    queryKey: ['artifacts', 'sales-sheet', salesSheetId],
    queryFn: () => apiFetch(`/exports/sales-sheet/${salesSheetId}/artifacts`),
    enabled: !!salesSheetId,
  })
}

export function useArtifactDownload() {
  return useMutation<{ downloadUrl: string; filename: string }, Error, string>({
    mutationFn: (artifactId) => apiFetch(`/exports/artifact/${artifactId}/download`),
  })
}
