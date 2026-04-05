'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTemplates } from '@/lib/hooks/use-templates'
import type { TemplateType } from '@/lib/hooks/use-templates'
import { cn } from '@/lib/utils'
import { Layout, ChevronRight, Layers, MonitorPlay } from 'lucide-react'

const TYPE_CONFIG: Record<TemplateType, { label: string; category: 'sheet' | 'deck'; color: string }> = {
  SALES_SHEET_HORIZONTAL: { label: 'Lâmina Horizontal', category: 'sheet', color: 'text-blue-400 border-blue-400/30' },
  SALES_SHEET_VERTICAL:   { label: 'Lâmina Vertical',   category: 'sheet', color: 'text-blue-400 border-blue-400/30' },
  SALES_SHEET_A4:         { label: 'Lâmina A4',         category: 'sheet', color: 'text-blue-400 border-blue-400/30' },
  DECK_CORPORATE:         { label: 'Deck Corporativo',  category: 'deck',  color: 'text-violet-400 border-violet-400/30' },
  DECK_RETAIL:            { label: 'Deck Varejo',       category: 'deck',  color: 'text-violet-400 border-violet-400/30' },
  DECK_PREMIUM:           { label: 'Deck Premium',      category: 'deck',  color: 'text-violet-400 border-violet-400/30' },
  DECK_DISTRIBUTOR:       { label: 'Deck Distribuidor', category: 'deck',  color: 'text-violet-400 border-violet-400/30' },
}

type Tab = 'all' | 'sheet' | 'deck'

export function TemplatesClient() {
  const [tab, setTab] = useState<Tab>('all')
  const { data: templates, isLoading } = useTemplates()

  const filtered = templates?.filter((t) => {
    if (tab === 'all') return true
    const cfg = TYPE_CONFIG[t.type]
    return cfg?.category === tab
  })

  const sheets = templates?.filter((t) => TYPE_CONFIG[t.type]?.category === 'sheet') ?? []
  const decks  = templates?.filter((t) => TYPE_CONFIG[t.type]?.category === 'deck')  ?? []

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Templates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {templates?.length ?? 0} templates — {sheets.length} lâminas · {decks.length} decks
        </p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-border bg-muted/10 p-1 w-fit">
        {(['all', 'sheet', 'deck'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-md px-4 py-1.5 text-sm transition-colors',
              tab === t
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t === 'all' ? 'Todos' : t === 'sheet' ? 'Lâminas' : 'Decks'}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-36 rounded-lg border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : !filtered?.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Layout className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Nenhum template</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((tpl) => {
            const cfg = TYPE_CONFIG[tpl.type]
            const zoneCount = Object.keys(tpl.zonesConfig).length
            const Icon = cfg?.category === 'deck' ? MonitorPlay : Layers
            return (
              <Link
                key={tpl.id}
                href={`/templates/${tpl.id}`}
                className="group flex flex-col rounded-lg border border-border bg-card p-5 hover:border-primary/50 transition-colors"
              >
                {/* Zone preview */}
                <div className="mb-4 h-24 w-full overflow-hidden rounded-md border border-border/50 bg-muted/10 relative">
                  <ZonePreview zones={tpl.zonesConfig} category={cfg?.category ?? 'sheet'} />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tpl.name}</p>
                    {tpl.description && (
                      <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{tpl.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-foreground transition-colors" />
                </div>

                <div className="mt-3 flex items-center gap-2">
                  <span className={cn('text-xs rounded-full border px-2.5 py-0.5', cfg?.color ?? 'text-muted-foreground border-border')}>
                    {cfg?.label ?? tpl.type}
                  </span>
                  <span className="text-xs text-muted-foreground">{zoneCount} zonas</span>
                  {tpl.variants.length > 0 && (
                    <span className="text-xs text-muted-foreground">{tpl.variants.length} variante(s)</span>
                  )}
                  {!tpl.isActive && (
                    <span className="text-xs text-muted-foreground/50">Inativo</span>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Miniatura visual das zones do template
function ZonePreview({ zones, category }: { zones: Record<string, any>; category: 'sheet' | 'deck' }) {
  const aspectRatio = category === 'sheet' ? 'aspect-[1.41/1]' : 'aspect-[16/9]'
  const ZONE_COLORS: Record<string, string> = {
    imageZone:       'bg-blue-500/25 border-blue-500/40',
    heroZone:        'bg-blue-500/25 border-blue-500/40',
    fullBleedZone:   'bg-blue-500/25 border-blue-500/40',
    headlineZone:    'bg-amber-500/25 border-amber-500/40',
    titleZone:       'bg-amber-500/25 border-amber-500/40',
    benefitsZone:    'bg-green-500/25 border-green-500/40',
    bodyZone:        'bg-green-500/25 border-green-500/40',
    ctaZone:         'bg-rose-500/25 border-rose-500/40',
    logoZone:        'bg-purple-500/25 border-purple-500/40',
    qrZone:          'bg-cyan-500/25 border-cyan-500/40',
    footerZone:      'bg-muted/30 border-border',
    specsZone:       'bg-teal-500/25 border-teal-500/40',
    comparativeZone: 'bg-orange-500/25 border-orange-500/40',
    col1Zone:        'bg-sky-500/20 border-sky-500/30',
    col2Zone:        'bg-sky-500/20 border-sky-500/30',
    col3Zone:        'bg-sky-500/20 border-sky-500/30',
    highlightZone:   'bg-yellow-500/25 border-yellow-500/40',
    taglineZone:     'bg-pink-500/25 border-pink-500/40',
    sidebarZone:     'bg-indigo-500/25 border-indigo-500/40',
    headerZone:      'bg-muted/40 border-border',
  }

  return (
    <div className="absolute inset-0">
      {Object.entries(zones).map(([zoneName, config]) => {
        const color = ZONE_COLORS[zoneName] ?? 'bg-muted/20 border-border'
        return (
          <div
            key={zoneName}
            className={cn('absolute border text-[6px] font-medium flex items-center justify-center overflow-hidden', color)}
            style={{
              left: config.x,
              top: config.y,
              width: config.width,
              height: config.height,
            }}
          />
        )
      })}
    </div>
  )
}
