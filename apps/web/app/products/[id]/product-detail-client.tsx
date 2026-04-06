'use client'

import Link from 'next/link'
import { useProduct } from '@/lib/hooks/use-products'
import { ArrowLeft, Package, ExternalLink } from 'lucide-react'

export function ProductDetailClient({ id }: { id: string }) {
  const { data: product, isLoading, error } = useProduct(id)

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <div className="h-8 w-64 rounded bg-muted/20 animate-pulse" />
        <div className="h-4 w-96 rounded bg-muted/20 animate-pulse" />
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="p-8">
        <Link href="/products" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>
        <p className="text-destructive text-sm">Produto não encontrado.</p>
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
    <div className="p-8 max-w-5xl">
      <Link href="/products" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Catálogo de Produtos
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start gap-6">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/20 overflow-hidden">
          {product.primaryImageUrl ? (
            <img src={product.primaryImageUrl} alt={product.name} className="h-full w-full object-contain" />
          ) : (
            <Package className="h-10 w-10 text-muted-foreground/40" />
          )}
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="font-mono text-sm text-muted-foreground">{product.sku}</span>
            <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{product.category}</span>
            {product.subcategory && (
              <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{product.subcategory}</span>
            )}
          </div>
          <h1 className="text-2xl font-bold">{product.name}</h1>
          <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-2xl">{product.description}</p>
        </div>
      </div>

      {/* Images */}
      {product.images.length > 0 && (
        <div className="mb-6 rounded-lg border border-border bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Imagens</h2>
          <div className="flex flex-wrap gap-3">
            {product.images.map((img) => (
              <div key={img.id} className="relative h-32 w-32 overflow-hidden rounded-md border border-border bg-muted/20">
                <img src={img.url} alt={product.name} className="h-full w-full object-contain" />
                {img.isPrimary && (
                  <span className="absolute bottom-1 left-1 rounded bg-primary/80 px-1 py-0.5 text-[10px] text-primary-foreground">
                    Principal
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Benefits */}
        {product.benefits.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Benefícios</h2>
            <ul className="space-y-2">
              {product.benefits.map((b) => (
                <li key={b.id} className="flex items-start gap-2 text-sm">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  {b.text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Specs */}
        {Object.keys(specGroups).length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Especificações</h2>
            <div className="space-y-4">
              {Object.entries(specGroups).map(([group, specs]) => (
                <div key={group}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">{group}</p>
                  <div className="space-y-1">
                    {specs.map((s) => (
                      <div key={s.id} className="flex justify-between text-sm border-b border-border/50 py-1">
                        <span className="text-muted-foreground">{s.key}</span>
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
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Claims Comerciais</h2>
            <ul className="space-y-2">
              {product.claims.map((c) => (
                <li key={c.id} className="flex items-start gap-2 text-sm">
                  <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.isVerified ? 'bg-green-500' : 'bg-yellow-500'}`} />
                  <span>{c.text}</span>
                  {!c.isVerified && <span className="text-xs text-muted-foreground">(não verificado)</span>}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Links */}
        {product.links.length > 0 && (
          <div className="rounded-lg border border-border bg-card p-5">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Links</h2>
            <ul className="space-y-2">
              {product.links.map((l) => (
                <li key={l.id}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline">
                    <ExternalLink className="h-3.5 w-3.5" />
                    {l.label}
                    <span className="text-xs text-muted-foreground">({l.type})</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* QR destination */}
      {product.qrDestination && (
        <div className="mt-6 rounded-lg border border-border bg-card p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">QR Code Destino</p>
            <p className="text-sm font-mono">{product.qrDestination}</p>
          </div>
        </div>
      )}
    </div>
  )
}
