'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useProducts, useProductCategories } from '@/lib/hooks/use-products'
import { cn } from '@/lib/utils'
import { Search, Package, ChevronRight } from 'lucide-react'

export function ProductsClient() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useProducts({ search, category, page })
  const { data: categories } = useProductCategories()

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Catálogo de Produtos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.total ?? 0} produtos cadastrados
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar por nome, SKU..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className="w-full rounded-md border border-border bg-background pl-9 pr-4 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <select
          value={category}
          onChange={(e) => { setCategory(e.target.value); setPage(1) }}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-ring"
        >
          <option value="">Todas as categorias</option>
          {categories?.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-48 rounded-lg border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar produtos. Verifique se a API está rodando.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data?.data.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/50 hover:bg-card/80"
              >
                {/* Image placeholder */}
                <div className="mb-3 flex h-32 items-center justify-center rounded-md bg-muted/30 overflow-hidden">
                  {product.primaryImageUrl ? (
                    <img src={product.primaryImageUrl} alt={product.name} className="h-full w-full object-contain" />
                  ) : (
                    <Package className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                {/* Info */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-muted-foreground">{product.sku}</span>
                    <span className="text-xs text-muted-foreground">{product.category}</span>
                  </div>
                  <p className="text-sm font-medium leading-tight group-hover:text-primary transition-colors line-clamp-2">
                    {product.name}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {data && data.total > data.pageSize && (
            <div className="mt-6 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Mostrando {((page - 1) * data.pageSize) + 1}–{Math.min(page * data.pageSize, data.total)} de {data.total}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted/20"
                >
                  Anterior
                </button>
                <button
                  disabled={page * data.pageSize >= data.total}
                  onClick={() => setPage(p => p + 1)}
                  className="rounded-md border border-border px-3 py-1.5 text-sm disabled:opacity-40 hover:bg-muted/20"
                >
                  Próximo
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
