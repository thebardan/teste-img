'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSalesSheets } from '@/lib/hooks/use-sales-sheets'
import { usePresentations } from '@/lib/hooks/use-presentations'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Layers, Presentation, Search, FolderOpen } from 'lucide-react'
import { STATUS_BADGE_VARIANT as STATUS_BADGE, STATUS_LABELS } from '@/lib/constants'

type FilterType = 'all' | 'sheet' | 'presentation'

export function LibraryClient() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<FilterType>('all')

  const { data: sheetsData, isLoading: loadingSheets } = useSalesSheets()
  const { data: presData, isLoading: loadingPres } = usePresentations()

  const isLoading = loadingSheets || loadingPres

  const sheets = (sheetsData?.data ?? [])
    .filter((s) => s.status === 'APPROVED')
    .map((s) => ({
      type: 'sheet' as const,
      id: s.id,
      title: s.title,
      status: s.status,
      subtitle: `Lâmina · ${s.product.name} · ${s.template.name}`,
      date: s.updatedAt,
      href: `/sales-sheets/${s.id}`,
    }))

  const presentations = (presData?.data ?? [])
    .filter((p: any) => p.status === 'APPROVED')
    .map((p: any) => ({
      type: 'presentation' as const,
      id: p.id,
      title: p.title,
      status: p.status,
      subtitle: `Apresentação · ${p.client?.name ?? 'Sem cliente'} · ${p.template.name}`,
      date: p.updatedAt,
      href: `/presentations/${p.id}`,
    }))

  let items = filter === 'sheet' ? sheets
    : filter === 'presentation' ? presentations
    : [...sheets, ...presentations]

  if (search) {
    const q = search.toLowerCase()
    items = items.filter((i) => i.title.toLowerCase().includes(q) || i.subtitle.toLowerCase().includes(q))
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const FILTERS: { value: FilterType; label: string }[] = [
    { value: 'all', label: 'Todos' },
    { value: 'sheet', label: 'Lâminas' },
    { value: 'presentation', label: 'Apresentações' },
  ]

  return (
    <div className="animate-slide-up">
      {/* Hero section — dark */}
      <section className="section-dark px-6 lg:px-10 py-16">
        <h1 className="text-hero font-semibold">Biblioteca de Materiais</h1>
        <p className="mt-2 text-body text-white/60">
          {items.length} material(is) aprovado(s)
        </p>
      </section>

      {/* Filters */}
      <section className="px-6 lg:px-10 py-8">
        <div className="max-w-5xl flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-64">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
            <input
              type="text"
              placeholder="Buscar materiais..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-comfortable border border-border bg-btn-default pl-9 pr-4 py-2 text-body outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
          <div className="flex gap-1 rounded-standard bg-black/[0.04] dark:bg-white/[0.06] p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={cn(
                  'rounded-comfortable px-3 py-1.5 text-caption transition-colors',
                  filter === f.value
                    ? 'bg-surface text-fg shadow-sm'
                    : 'text-fg-secondary hover:text-fg',
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Grid */}
      <section className="px-6 lg:px-10 pb-10">
        <div className="max-w-5xl">
          {isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-36 rounded-standard" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="Nenhum material aprovado"
              description="Materiais aprovados aparecerão aqui para consulta rápida"
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
              {items.map((item) => (
                <Link
                  key={`${item.type}-${item.id}`}
                  href={item.href}
                  className="group rounded-standard bg-surface p-4 transition-all hover:shadow-card"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-standard bg-accent/[0.08] text-accent">
                      {item.type === 'sheet' ? <Layers className="h-5 w-5" /> : <Presentation className="h-5 w-5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-caption font-medium truncate group-hover:text-accent transition-colors">
                        {item.title}
                      </p>
                      <p className="text-micro text-fg-secondary mt-0.5">{item.subtitle}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <Badge variant={STATUS_BADGE[item.status]}>
                          {STATUS_LABELS[item.status] ?? item.status}
                        </Badge>
                        <span className="text-nano text-fg-tertiary">
                          {new Date(item.date).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
