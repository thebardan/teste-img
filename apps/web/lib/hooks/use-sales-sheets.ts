'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface SalesSheetSummary {
  id: string
  title: string
  status: string
  product: { name: string; sku: string }
  template: { name: string }
  author: { name: string }
  versions: { versionNumber: number; content: any }[]
  createdAt: string
  updatedAt: string
}

export interface SalesSheetVersion {
  id: string
  versionNumber: number
  content: any
  createdAt: string
  artifacts: any[]
  inferenceLogs: any[]
}

export interface SalesSheetDetail {
  id: string
  title: string
  status: string
  product: { name: string; sku: string; images: any[]; benefits: any[]; specifications: any[] }
  template: { id: string; name: string; zonesConfig: any }
  author: { id: string; name: string; email: string }
  versions: SalesSheetVersion[]
  approvals: any[]
  createdAt: string
  updatedAt: string
}

export interface GenerateInput {
  productId: string
  templateId?: string
  channel?: string
  qrUrl?: string
}

export function useSalesSheets() {
  return useQuery<{ data: SalesSheetSummary[]; total: number }>({
    queryKey: ['sales-sheets'],
    queryFn: () => apiFetch('/sales-sheets'),
  })
}

export function useSalesSheet(id: string) {
  return useQuery<SalesSheetDetail>({
    queryKey: ['sales-sheet', id],
    queryFn: () => apiFetch(`/sales-sheets/${id}`),
    enabled: !!id,
  })
}

export function useGenerateSalesSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GenerateInput) =>
      apiFetch('/sales-sheets/generate', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['sales-sheets'] }),
  })
}
