'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTemplate, useUpdateTemplate } from '@/lib/hooks/use-templates'
import type { ZoneConfig } from '@/lib/hooks/use-templates'
import { cn } from '@/lib/utils'
import { ArrowLeft, Layout, Check, Pencil, X, Loader2 } from 'lucide-react'

const TYPE_LABELS: Record<string, string> = {
  SALES_SHEET_HORIZONTAL: 'Lâmina Horizontal',
  SALES_SHEET_VERTICAL:   'Lâmina Vertical',
  SALES_SHEET_A4:         'Lâmina A4',
  DECK_CORPORATE:         'Deck Corporativo',
  DECK_RETAIL:            'Deck Varejo',
  DECK_PREMIUM:           'Deck Premium',
  DECK_DISTRIBUTOR:       'Deck Distribuidor',
}

const ZONE_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  imageZone:       { bg: 'bg-blue-500/20',    border: 'border-blue-500/50',    label: 'Imagem' },
  heroZone:        { bg: 'bg-blue-500/20',    border: 'border-blue-500/50',    label: 'Hero' },
  fullBleedZone:   { bg: 'bg-blue-500/20',    border: 'border-blue-500/50',    label: 'Full Bleed' },
  headlineZone:    { bg: 'bg-amber-500/20',   border: 'border-amber-500/50',   label: 'Headline' },
  titleZone:       { bg: 'bg-amber-500/20',   border: 'border-amber-500/50',   label: 'Título' },
  benefitsZone:    { bg: 'bg-green-500/20',   border: 'border-green-500/50',   label: 'Benefícios' },
  bodyZone:        { bg: 'bg-green-500/20',   border: 'border-green-500/50',   label: 'Corpo' },
  ctaZone:         { bg: 'bg-rose-500/20',    border: 'border-rose-500/50',    label: 'CTA' },
  logoZone:        { bg: 'bg-purple-500/20',  border: 'border-purple-500/50',  label: 'Logo' },
  qrZone:          { bg: 'bg-cyan-500/20',    border: 'border-cyan-500/50',    label: 'QR Code' },
  footerZone:      { bg: 'bg-muted/30',       border: 'border-border',         label: 'Rodapé' },
  headerZone:      { bg: 'bg-muted/40',       border: 'border-border',         label: 'Cabeçalho' },
  specsZone:       { bg: 'bg-teal-500/20',    border: 'border-teal-500/50',    label: 'Specs' },
  comparativeZone: { bg: 'bg-orange-500/20',  border: 'border-orange-500/50',  label: 'Comparativo' },
  col1Zone:        { bg: 'bg-sky-500/20',     border: 'border-sky-500/50',     label: 'Coluna 1' },
  col2Zone:        { bg: 'bg-sky-500/20',     border: 'border-sky-500/50',     label: 'Coluna 2' },
  col3Zone:        { bg: 'bg-sky-500/20',     border: 'border-sky-500/50',     label: 'Coluna 3' },
  highlightZone:   { bg: 'bg-yellow-500/20',  border: 'border-yellow-500/50',  label: 'Destaque' },
  taglineZone:     { bg: 'bg-pink-500/20',    border: 'border-pink-500/50',    label: 'Tagline' },
  sidebarZone:     { bg: 'bg-indigo-500/20',  border: 'border-indigo-500/50',  label: 'Sidebar' },
}

function getZoneStyle(z: ZoneConfig) {
  return { left: z.x, top: z.y, width: z.width, height: z.height }
}

export function TemplateDetailClient({ id }: { id: string }) {
  const { data: template, isLoading } = useTemplate(id)
  const { mutateAsync: updateTemplate, isPending: isSaving } = useUpdateTemplate()
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')

  if (isLoading) return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded bg-muted/20" />
      <div className="h-8 w-72 rounded bg-muted/20" />
      <div className="h-80 rounded-lg bg-muted/20" />
    </div>
  )

  if (!template) return <div className="p-8 text-sm text-destructive">Template não encontrado.</div>

  const isSheet = template.type.startsWith('SALES_SHEET')
  const zones = Object.entries(template.zonesConfig)

  async function saveName() {
    if (!nameValue.trim() || nameValue === template!.name) { setEditingName(false); return }
    await updateTemplate({ id, data: { name: nameValue.trim() } })
    setEditingName(false)
  }

  async function toggleActive() {
    await updateTemplate({ id, data: { isActive: !template!.isActive } })
  }

  function startEditName() {
    setNameValue(template!.name)
    setEditingName(true)
  }

  return (
    <div className="p-8 max-w-6xl">
      <Link
        href="/templates"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Templates
      </Link>

      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          {editingName ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                className="rounded-md border border-primary bg-background px-3 py-1 text-xl font-bold outline-none"
              />
              <button onClick={saveName} disabled={isSaving} className="text-primary hover:text-primary/80">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              </button>
              <button onClick={() => setEditingName(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{template.name}</h1>
              <button onClick={startEditName} className="text-muted-foreground/50 hover:text-muted-foreground transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {TYPE_LABELS[template.type] ?? template.type}
            {template.description ? ` — ${template.description}` : ''}
          </p>
        </div>

        <button
          onClick={toggleActive}
          disabled={isSaving}
          className={cn(
            'rounded-full border px-3 py-1 text-xs transition-colors',
            template.isActive
              ? 'text-success border-success/30 hover:border-danger/30 hover:text-danger'
              : 'text-muted-foreground border-border hover:border-success/30 hover:text-success',
          )}
        >
          {template.isActive ? 'Ativo' : 'Inativo'}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Zone Map */}
        <div className="lg:col-span-2">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Mapa de Zonas
          </p>
          <div
            className={cn(
              'relative w-full overflow-hidden rounded-lg border border-border bg-muted/5',
              isSheet ? 'aspect-[1.41/1]' : 'aspect-[16/9]',
            )}
          >
            {zones.map(([zoneName, config]) => {
              const zc = ZONE_COLORS[zoneName] ?? { bg: 'bg-muted/20', border: 'border-border', label: zoneName }
              return (
                <div
                  key={zoneName}
                  className={cn(
                    'absolute border flex items-center justify-center overflow-hidden',
                    zc.bg,
                    zc.border,
                  )}
                  style={getZoneStyle(config as ZoneConfig)}
                >
                  <span className="text-[9px] font-semibold text-foreground/60 px-1 text-center leading-tight">
                    {zc.label}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground text-center">
            Proporção {isSheet ? 'A4 paisagem / retrato' : '16:9 deck'}
          </p>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Zone List */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Layout className="h-3.5 w-3.5" /> {zones.length} Zonas
            </div>
            <div className="space-y-1.5">
              {zones.map(([zoneName, config]) => {
                const zc = ZONE_COLORS[zoneName]
                return (
                  <div key={zoneName} className="flex items-center gap-2 text-sm">
                    <div className={cn('h-2.5 w-2.5 rounded-sm border shrink-0', zc?.bg ?? 'bg-muted/20', zc?.border ?? 'border-border')} />
                    <span className="flex-1 text-xs">{zc?.label ?? zoneName}</span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {(config as ZoneConfig).width} × {(config as ZoneConfig).height}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Variants */}
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Variantes ({template.variants.length})
            </p>
            {template.variants.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhuma variante cadastrada</p>
            ) : (
              <div className="space-y-2">
                {template.variants.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1.5 last:border-0">
                    <span className="text-xs">{v.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {Object.keys(v.zonesConfig).length} zonas
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="rounded-lg border border-border bg-card p-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Info</p>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between border-b border-border/50 py-1">
                <span className="text-muted-foreground">Tipo</span>
                <span className="font-mono">{template.type}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 py-1">
                <span className="text-muted-foreground">ID</span>
                <span className="font-mono text-muted-foreground/70 truncate max-w-28">{template.id}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-muted-foreground">Atualizado</span>
                <span>{new Date(template.updatedAt).toLocaleDateString('pt-BR')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
