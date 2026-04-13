'use client'

import Link from 'next/link'
import { useProduct } from '@/lib/hooks/use-products'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ArrowLeft, Package, ExternalLink } from 'lucide-react'

export function ProductDetailClient({ id }: { id: string }) {
  const { data: product, isLoading, error } = useProduct(id)

  if (isLoading) {
    return (
      <div className="animate-slide-up">
        <section className="section-dark px-6 lg:px-10 py-16">
          <Skeleton className="h-8 w-64 bg-white/10" />
          <Skeleton className="mt-3 h-4 w-96 bg-white/10" />
        </section>
        <section className="px-6 lg:px-10 py-10">
          <div className="max-w-5xl grid grid-cols-1 gap-6 lg:grid-cols-2 stagger">
            <Skeleton className="h-48 rounded-standard" />
            <Skeleton className="h-48 rounded-standard" />
          </div>
        </section>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="animate-slide-up">
        <section className="section-dark px-6 lg:px-10 py-16">
          <Link href="/products" className="flex items-center gap-1 text-caption text-white/50 hover:text-white/80 mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4" /> Catálogo de Produtos
          </Link>
          <p className="text-body text-danger">Produto não encontrado.</p>
        </section>
      </div>
    )
  }

  const specGroups = product.specifications.reduce((acc, spec) => {
    const g = spec.group ?? 'Geral'
    if (!acc[g]) acc[g] = []
    acc[g].push(spec)
    return acc
  }, {} as Record<string, typeof product.specifications>)

  return (
    <div className="animate-slide-up">
      {/* Hero section — dark */}
      <section className="section-dark px-6 lg:px-10 py-16">
        <Link href="/products" className="flex items-center gap-1 text-caption text-white/50 hover:text-white/80 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Catálogo de Produtos
        </Link>

        <div className="flex items-start gap-6">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-standard bg-white/10 overflow-hidden">
            {product.primaryImageUrl ? (
              <img src={product.primaryImageUrl} alt={product.name} className="h-full w-full object-contain" />
            ) : (
              <Package className="h-10 w-10 text-white/30" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="font-mono text-micro text-white/50">{product.sku}</span>
              <Badge variant="default">{product.category}</Badge>
              {product.subcategory && <Badge variant="default">{product.subcategory}</Badge>}
            </div>
            <h1 className="text-hero font-semibold">{product.name}</h1>
            <p className="mt-2 text-body text-white/60 max-w-2xl">{product.description}</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-5xl">
          {/* Images */}
          {product.images.length > 0 && (
            <div className="mb-8 rounded-standard bg-surface p-5">
              <h2 className="mb-3 text-micro font-semibold uppercase tracking-wide text-fg-tertiary">Imagens</h2>
              <div className="flex flex-wrap gap-3">
                {product.images.map((img) => (
                  <div key={img.id} className="relative h-32 w-32 overflow-hidden rounded-standard bg-black/[0.03] dark:bg-white/[0.06]">
                    <img src={img.url} alt={product.name} className="h-full w-full object-contain" />
                    {img.isPrimary && (
                      <span className="absolute bottom-1 left-1 rounded-pill bg-accent/80 px-1.5 py-0.5 text-nano text-white font-medium">
                        Principal
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 stagger">
            {/* Benefits */}
            {product.benefits.length > 0 && (
              <div className="rounded-standard bg-surface p-5">
                <h2 className="mb-3 text-micro font-semibold uppercase tracking-wide text-fg-tertiary">Benefícios</h2>
                <ul className="space-y-2">
                  {product.benefits.map((b) => (
                    <li key={b.id} className="flex items-start gap-2 text-caption">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {b.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Specs */}
            {Object.keys(specGroups).length > 0 && (
              <div className="rounded-standard bg-surface p-5">
                <h2 className="mb-3 text-micro font-semibold uppercase tracking-wide text-fg-tertiary">Especificações</h2>
                <div className="space-y-4">
                  {Object.entries(specGroups).map(([group, specs]) => (
                    <div key={group}>
                      <p className="text-micro font-medium text-fg-secondary mb-1">{group}</p>
                      <div className="space-y-1">
                        {specs.map((s) => (
                          <div key={s.id} className="flex justify-between text-caption border-b border-border py-1">
                            <span className="text-fg-secondary">{s.key}</span>
                            <span className="font-medium">{s.value}{s.unit ? ` ${s.unit}` : ''}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Claims */}
            {product.claims.length > 0 && (
              <div className="rounded-standard bg-surface p-5">
                <h2 className="mb-3 text-micro font-semibold uppercase tracking-wide text-fg-tertiary">Claims Comerciais</h2>
                <ul className="space-y-2">
                  {product.claims.map((c) => (
                    <li key={c.id} className="flex items-start gap-2 text-caption">
                      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.isVerified ? 'bg-success' : 'bg-warning'}`} />
                      <span>{c.text}</span>
                      {!c.isVerified && <span className="text-micro text-fg-tertiary">(não verificado)</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Links */}
            {product.links.length > 0 && (
              <div className="rounded-standard bg-surface p-5">
                <h2 className="mb-3 text-micro font-semibold uppercase tracking-wide text-fg-tertiary">Links</h2>
                <ul className="space-y-2">
                  {product.links.map((l) => (
                    <li key={l.id}>
                      <a href={l.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-2 text-caption text-accent hover:underline">
                        <ExternalLink className="h-3.5 w-3.5" />
                        {l.label}
                        <span className="text-micro text-fg-tertiary">({l.type})</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* QR destination */}
          {product.qrDestination && (
            <div className="mt-8 rounded-standard bg-surface p-5 flex items-center justify-between">
              <div>
                <p className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1">QR Code Destino</p>
                <p className="text-caption font-mono">{product.qrDestination}</p>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
