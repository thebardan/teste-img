'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'
import { getSession } from 'next-auth/react'

export type BackgroundType = 'DARK' | 'LIGHT' | 'COLORED' | 'ANY'
export type BrandAssetType = 'LOGO' | 'ICON' | 'PATTERN' | 'COLOR_SWATCH'

export interface BrandRule {
  id: string
  condition: string
  score: number
  notes: string | null
}

export interface BrandAsset {
  id: string
  name: string
  type: BrandAssetType
  url: string
  format: string
  bestOn: BackgroundType
  description: string | null
  isActive: boolean
  rules: BrandRule[]
}

export function useBrandAssets() {
  return useQuery<BrandAsset[]>({
    queryKey: ['brand-assets'],
    queryFn: () => apiFetch('/brand-assets'),
    staleTime: 5 * 60 * 1000,
  })
}

export function useUploadBrandAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (data: { file: File; name: string; bestOn: BackgroundType; description?: string }) => {
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api'
      const session = await getSession()
      const formData = new FormData()
      formData.append('file', data.file)
      formData.append('name', data.name)
      formData.append('bestOn', data.bestOn)
      if (data.description) formData.append('description', data.description)

      const headers: Record<string, string> = {}
      const apiSecret = process.env.API_SECRET ?? ''
      if (apiSecret) headers['x-api-key'] = apiSecret
      if (session?.user) {
        const user = session.user as { email?: string; role?: string }
        if (user.email) headers['x-user-email'] = user.email
        if (user.role) headers['x-user-role'] = user.role
      }

      const res = await fetch(`${API_URL}/brand-assets/upload`, {
        method: 'POST',
        headers,
        body: formData,
      })
      if (!res.ok) throw new Error(`Upload failed: ${res.status}`)
      return res.json() as Promise<BrandAsset>
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brand-assets'] })
    },
  })
}
