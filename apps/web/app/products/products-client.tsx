'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useProducts, useProductCategories } from '@/lib/hooks/use-products'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Button } from '@/components/ui/button'
import { Search, Package, ChevronRight, ChevronLeft } from 'lucide-react'

export function ProductsClient() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [page, setPage] = useState(1)

  const { data, isLoading, error } = useProducts({ search, category, page })
  const { data: categories } = useProductCategories()

  return (
    <div className="animate-slide-up">
      {/* Hero section — dark, cinematic */}
      <section className="section-dark px-6 lg:px-10 py-16">
        <h1 className="text-hero font-semibold">Catálogo de Produtos</h1>
        <p className="mt-2 text-body text-white/60">
          {data?.total ?? 0} produtos cadastrados
        </p>
      </section>

      {/* Filters */}
      <section className="px-6 lg:px-10 py-8">
        <div className="max-w-5xl flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
            <input
              type="text"
              placeholder="Buscar por nome, SKU..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="w-full rounded-comfortable border border-border bg-btn-default pl-9 pr-4 py-2 text-body outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <select
            value={category}
            onChange={(e) => { setCategory(e.target.value); setPage(1) }}
            className="rounded-comfortable border border-border bg-btn-default px-3 py-2 text-body outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">Todas as categorias</option>
            {categories?.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 lg:px-10 pb-10">
        <div className="max-w-5xl">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-52 rounded-standard" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-standard bg-danger/10 p-4 text-caption text-danger">
              Erro ao carregar produtos. Verifique se a API está rodando.
            </div>
          ) : !data?.data.length ? (
            <EmptyState
              icon={Package}
              title="Nenhum produto encontrado"
              description="Tente alterar os filtros de busca"
            />
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 stagger">
                {data.data.map((product) => (
                  <Link
                    key={product.id}
                    href={`/products/${product.id}`}
                    className="group rounded-standard bg-surface p-4 transition-all hover:shadow-card"
                  >
                    {/* Image */}
                    <div className="mb-3 flex h-32 items-center justify-center rounded-standard bg-black/[0.03] dark:bg-white/[0.06] overflow-hidden">
                      {product.primaryImageUrl ? (
                        <img src={product.primaryImageUrl} alt={product.name} className="h-full w-full object-contain" />
                      ) : (
                        <Package className="h-8 w-8 text-fg-tertiary" />
                      )}
                    </div>
                    {/* Info */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-micro font-mono text-fg-tertiary">{product.sku}</span>
                        <Badge variant="default">{product.category}</Badge>
                      </div>
                      <p className="text-caption font-medium leading-tight group-hover:text-accent transition-colors line-clamp-2">
                        {product.name}
                      </p>
                      <p className="text-micro text-fg-secondary line-clamp-2">{product.description}</p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Pagination */}
              {data.total > data.pageSize && (
                <div className="mt-8 flex items-center justify-between">
                  <span className="text-caption text-fg-secondary">
                    Mostrando {((page - 1) * data.pageSize) + 1}–{Math.min(page * data.pageSize, data.total)} de {data.total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => p - 1)}
                    >
                      <ChevronLeft className="h-3.5 w-3.5" /> Anterior
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={page * data.pageSize >= data.total}
                      onClick={() => setPage(p => p + 1)}
                    >
                      Próximo <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
