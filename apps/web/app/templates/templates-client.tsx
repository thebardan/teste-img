'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTemplates } from '@/lib/hooks/use-templates'
import type { TemplateType } from '@/lib/hooks/use-templates'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Layout, ChevronRight, Layers, MonitorPlay } from 'lucide-react'

const TYPE_CONFIG: Record<TemplateType, { label: string; category: 'sheet' | 'deck'; color: string }> = {
  SALES_SHEET_HORIZONTAL: { label: 'Lâmina Horizontal', category: 'sheet', color: 'text-primary border-primary/30' },
  SALES_SHEET_VERTICAL:   { label: 'Lâmina Vertical',   category: 'sheet', color: 'text-primary border-primary/30' },
  SALES_SHEET_A4:         { label: 'Lâmina A4',         category: 'sheet', color: 'text-primary border-primary/30' },
  DECK_CORPORATE:         { label: 'Deck Corporativo',  category: 'deck',  color: 'text-accent border-accent/30' },
  DECK_RETAIL:            { label: 'Deck Varejo',       category: 'deck',  color: 'text-accent border-accent/30' },
  DECK_PREMIUM:           { label: 'Deck Premium',      category: 'deck',  color: 'text-accent border-accent/30' },
  DECK_DISTRIBUTOR:       { label: 'Deck Distribuidor', category: 'deck',  color: 'text-accent border-accent/30' },
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
    <div className="p-6 lg:p-8 max-w-6xl animate-slide-up">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
        <p className="mt-1 text-sm text-fg-secondary">
          {templates?.length ?? 0} templates — {sheets.length} lâminas · {decks.length} decks
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" onValueChange={(v) => setTab(v as Tab)}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Todos</TabsTrigger>
          <TabsTrigger value="sheet">Lâminas</TabsTrigger>
          <TabsTrigger value="deck">Decks</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : !filtered?.length ? (
        <EmptyState icon={Layout} title="Nenhum template" />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
          {filtered.map((tpl) => {
            const cfg = TYPE_CONFIG[tpl.type]
            const zoneCount = Object.keys(tpl.zonesConfig).length
            return (
              <Link
                key={tpl.id}
                href={`/templates/${tpl.id}`}
                className="group flex flex-col rounded-lg border border-border bg-canvas p-5 hover:shadow-card hover:border-fg-tertiary hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="mb-4 h-24 w-full overflow-hidden rounded-md border border-border/50 bg-black/[0.03] relative">
                  <ZonePreview zones={tpl.zonesConfig} category={cfg?.category ?? 'sheet'} />
                </div>

                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{tpl.name}</p>
                    {tpl.description && (
                      <p className="mt-0.5 text-xs text-fg-secondary line-clamp-2">{tpl.description}</p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-fg-tertiary shrink-0 mt-0.5 group-hover:text-fg transition-colors" />
                </div>

                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <Badge variant={cfg?.category === 'deck' ? 'accent' : 'default'} className="text-[10px]">
                    {cfg?.label ?? tpl.type}
                  </Badge>
                  <span className="text-xs text-fg-secondary">{zoneCount} zonas</span>
                  {tpl.variants.length > 0 && (
                    <span className="text-xs text-fg-secondary">{tpl.variants.length} variante(s)</span>
                  )}
                  {!tpl.isActive && <Badge variant="default" className="text-[10px]">Inativo</Badge>}
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
        const color = ZONE_COLORS[zoneName] ?? 'bg-black/[0.03] border-border'
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
