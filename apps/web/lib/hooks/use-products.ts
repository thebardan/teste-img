'use client'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface ProductSummary {
  id: string
  sku: string
  name: string
  brand: string
  category: string
  subcategory: string | null
  description: string
  isActive: boolean
  primaryImageUrl: string | null
}

export interface PaginatedProducts {
  data: ProductSummary[]
  total: number
  page: number
  pageSize: number
}

export interface ProductDetail extends ProductSummary {
  qrDestination: string | null
  images: { id: string; url: string; isPrimary: boolean; order: number }[]
  specifications: { id: string; key: string; value: string; unit: string | null; group: string | null }[]
  benefits: { id: string; text: string; order: number }[]
  claims: { id: string; text: string; isVerified: boolean }[]
  packaging: { weightKg: number | null; widthCm: number | null; heightCm: number | null; depthCm: number | null; eanCode: string | null } | null
  links: { id: string; label: string; url: string; type: string }[]
}

export function useProducts(params: { search?: string; category?: string; page?: number } = {}) {
  const query = new URLSearchParams()
  if (params.search) query.set('search', params.search)
  if (params.category) query.set('category', params.category)
  query.set('page', String(params.page ?? 1))
  query.set('isActive', 'true')

  return useQuery<PaginatedProducts>({
    queryKey: ['products', params],
    queryFn: () => apiFetch(`/products?${query}`),
  })
}

export function useProduct(id: string) {
  return useQuery<ProductDetail>({
    queryKey: ['product', id],
    queryFn: () => apiFetch(`/products/${id}`),
    enabled: !!id,
  })
}

export function useProductCategories() {
  return useQuery<string[]>({
    queryKey: ['product-categories'],
    queryFn: () => apiFetch('/products/categories'),
    staleTime: 5 * 60 * 1000,
  })
}
