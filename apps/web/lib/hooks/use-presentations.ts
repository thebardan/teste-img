'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface PresentationSummary {
  id: string
  title: string
  status: string
  focus: string | null
  channel: string | null
  client: { name: string } | null
  template: { name: string }
  author: { name: string }
  versions: {
    versionNumber: number
    slides: { order: number; content: any }[]
  }[]
  createdAt: string
  updatedAt: string
}

export interface PresentationDetail {
  id: string
  title: string
  status: string
  focus: string | null
  channel: string | null
  client: { id: string; name: string; segment: string | null } | null
  template: { id: string; name: string; zonesConfig: any }
  author: { id: string; name: string }
  versions: {
    id: string
    versionNumber: number
    slides: { id: string; order: number; content: any }[]
    artifacts: any[]
  }[]
  approvals: { id: string; status: string; approver: { name: string }; createdAt: string }[]
  createdAt: string
  updatedAt: string
}

export interface GeneratePresentationInput {
  productIds: string[]
  clientId?: string
  templateId?: string
  focus?: string
  channel?: string
}

export function usePresentations() {
  return useQuery<{ data: PresentationSummary[]; total: number; page: number; pageSize: number }>({
    queryKey: ['presentations'],
    queryFn: () => apiFetch('/presentations'),
  })
}

export function usePresentation(id: string) {
  return useQuery<PresentationDetail>({
    queryKey: ['presentation', id],
    queryFn: () => apiFetch(`/presentations/${id}`),
    enabled: !!id,
  })
}

export function useGeneratePresentation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GeneratePresentationInput) =>
      apiFetch('/presentations/generate', { method: 'POST', body: JSON.stringify(input) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['presentations'] }),
  })
}

export function useUpdateSlideContent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, order, content }: { id: string; order: number; content: Record<string, any> }) =>
      apiFetch(`/presentations/${id}/slides/${order}/content`, {
        method: 'PATCH',
        body: JSON.stringify(content),
      }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['presentation', vars.id] }),
  })
}

export function useRegenerateSlide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, order }: { id: string; order: number }) =>
      apiFetch(`/presentations/${id}/slides/${order}/regenerate`, { method: 'POST' }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['presentation', vars.id] }),
  })
}

export function useReorderSlides() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, orderedIds }: { id: string; orderedIds: string[] }) =>
      apiFetch(`/presentations/${id}/slides/reorder`, {
        method: 'POST',
        body: JSON.stringify({ orderedIds }),
      }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['presentation', vars.id] }),
  })
}

export type SlideType = 'cover' | 'context' | 'products' | 'benefits' | 'closing'

export function useAddSlide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, type, afterOrder }: { id: string; type: SlideType; afterOrder?: number }) =>
      apiFetch(`/presentations/${id}/slides`, {
        method: 'POST',
        body: JSON.stringify({ type, afterOrder }),
      }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['presentation', vars.id] }),
  })
}

export function useRemoveSlide() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, order }: { id: string; order: number }) =>
      apiFetch(`/presentations/${id}/slides/${order}`, { method: 'DELETE' }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ['presentation', vars.id] }),
  })
}
