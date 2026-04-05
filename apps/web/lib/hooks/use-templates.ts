'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export type TemplateType =
  | 'SALES_SHEET_HORIZONTAL'
  | 'SALES_SHEET_VERTICAL'
  | 'SALES_SHEET_A4'
  | 'DECK_CORPORATE'
  | 'DECK_RETAIL'
  | 'DECK_PREMIUM'
  | 'DECK_DISTRIBUTOR'

export interface TemplateVariant {
  id: string
  name: string
  zonesConfig: Record<string, ZoneConfig>
}

export interface ZoneConfig {
  x: string | number
  y: string | number
  width: string | number
  height: string | number
}

export interface Template {
  id: string
  name: string
  type: TemplateType
  description: string | null
  zonesConfig: Record<string, ZoneConfig>
  isActive: boolean
  variants: TemplateVariant[]
  createdAt: string
  updatedAt: string
}

export interface UpdateTemplateInput {
  name?: string
  description?: string
  zonesConfig?: Record<string, ZoneConfig>
  isActive?: boolean
}

export interface CreateVariantInput {
  name: string
  zonesConfig: Record<string, ZoneConfig>
}

export function useTemplates(type?: TemplateType, activeOnly?: boolean) {
  const params = new URLSearchParams()
  if (type) params.set('type', type)
  if (activeOnly) params.set('activeOnly', 'true')
  const qs = params.toString()

  return useQuery<Template[]>({
    queryKey: ['templates', type, activeOnly],
    queryFn: () => apiFetch(`/templates${qs ? `?${qs}` : ''}`),
  })
}

export function useTemplate(id: string) {
  return useQuery<Template>({
    queryKey: ['template', id],
    queryFn: () => apiFetch(`/templates/${id}`),
    enabled: !!id,
  })
}

export function useUpdateTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTemplateInput }) =>
      apiFetch(`/templates/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['templates'] })
      qc.invalidateQueries({ queryKey: ['template', id] })
    },
  })
}

export function useAddVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, data }: { templateId: string; data: CreateVariantInput }) =>
      apiFetch(`/templates/${templateId}/variants`, { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: (_data, { templateId }) => {
      qc.invalidateQueries({ queryKey: ['template', templateId] })
    },
  })
}

export function useRemoveVariant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ templateId, variantId }: { templateId: string; variantId: string }) =>
      apiFetch(`/templates/${templateId}/variants/${variantId}`, { method: 'DELETE' }),
    onSuccess: (_data, { templateId }) => {
      qc.invalidateQueries({ queryKey: ['template', templateId] })
    },
  })
}
