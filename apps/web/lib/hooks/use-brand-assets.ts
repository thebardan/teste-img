'use client'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

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
