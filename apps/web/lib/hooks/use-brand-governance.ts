'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface TonePreset {
  id: string
  category: string
  tone: string
  voice: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ChannelCtaPreset {
  id: string
  channel: string
  ctas: string[]
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface ClientBrandProfile {
  voice?: string
  forbiddenTerms?: string[]
  requiredDisclaimers?: string[]
  toneOverride?: string
}

// ─── Tones ────────────────────────────────────────────────────────────────────

export function useTonePresets() {
  return useQuery<TonePreset[]>({
    queryKey: ['brand-governance', 'tones'],
    queryFn: () => apiFetch('/brand-governance/tones'),
  })
}

export function useUpsertTone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ category, tone, voice, isActive }: { category: string; tone: string; voice: string; isActive?: boolean }) =>
      apiFetch(`/brand-governance/tones/${encodeURIComponent(category)}`, {
        method: 'PUT',
        body: JSON.stringify({ tone, voice, isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-governance', 'tones'] }),
  })
}

export function useDeleteTone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/brand-governance/tones/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-governance', 'tones'] }),
  })
}

// ─── Channel CTAs ─────────────────────────────────────────────────────────────

export function useChannelCtas() {
  return useQuery<ChannelCtaPreset[]>({
    queryKey: ['brand-governance', 'channel-ctas'],
    queryFn: () => apiFetch('/brand-governance/channel-ctas'),
  })
}

export function useUpsertChannelCtas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ channel, ctas, isActive }: { channel: string; ctas: string[]; isActive?: boolean }) =>
      apiFetch(`/brand-governance/channel-ctas/${encodeURIComponent(channel)}`, {
        method: 'PUT',
        body: JSON.stringify({ ctas, isActive }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-governance', 'channel-ctas'] }),
  })
}

export function useDeleteChannelCtas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/brand-governance/channel-ctas/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['brand-governance', 'channel-ctas'] }),
  })
}

// ─── Client profile ───────────────────────────────────────────────────────────

export function useClientBrandProfile(clientId: string) {
  return useQuery<{ profile: ClientBrandProfile | null }>({
    queryKey: ['brand-governance', 'client-profile', clientId],
    queryFn: () => apiFetch(`/brand-governance/clients/${clientId}/profile`),
    enabled: !!clientId,
  })
}

export function useUpdateClientBrandProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ clientId, profile }: { clientId: string; profile: ClientBrandProfile }) =>
      apiFetch(`/brand-governance/clients/${clientId}/profile`, {
        method: 'PUT',
        body: JSON.stringify(profile),
      }),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ['brand-governance', 'client-profile', vars.clientId] }),
  })
}
