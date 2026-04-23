'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ChevronDown, ChevronUp, GitCompare } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Version {
  id: string
  versionNumber: number
  createdAt: string
  content?: any
  slides?: { order: number; content: any }[]
}

interface VersionDiffProps {
  versions: Version[]
  kind: 'salesSheet' | 'presentation'
}

const SHEET_FIELDS: { key: string; label: string; isArray?: boolean }[] = [
  { key: 'headline', label: 'Headline' },
  { key: 'subtitle', label: 'Subtítulo' },
  { key: 'benefits', label: 'Benefícios', isArray: true },
  { key: 'cta', label: 'CTA' },
]

function formatValue(v: any, isArray: boolean): string {
  if (isArray && Array.isArray(v)) return v.map((x, i) => `${i + 1}. ${x}`).join('\n')
  if (v == null) return '—'
  if (typeof v === 'object') return JSON.stringify(v, null, 2)
  return String(v)
}

export function VersionDiff({ versions, kind }: VersionDiffProps) {
  const [open, setOpen] = useState(false)
  if (versions.length < 2) return null

  const [curr, prev] = versions // versions already sorted desc by versionNumber

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          <GitCompare className="h-4 w-4 text-accent" />
          <CardTitle className="text-sm">Comparar v{prev.versionNumber} → v{curr.versionNumber}</CardTitle>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-fg-tertiary" /> : <ChevronDown className="h-4 w-4 text-fg-tertiary" />}
      </button>

      {open && (
        <CardContent className="pt-0">
          {kind === 'salesSheet' ? (
            <SalesSheetDiff prev={prev.content} curr={curr.content} />
          ) : (
            <PresentationDiff
              prevSlides={prev.slides ?? []}
              currSlides={curr.slides ?? []}
            />
          )}
        </CardContent>
      )}
    </Card>
  )
}

function DiffRow({ label, prev, curr, isArray = false }: { label: string; prev: any; curr: any; isArray?: boolean }) {
  const prevStr = formatValue(prev, isArray)
  const currStr = formatValue(curr, isArray)
  const changed = prevStr !== currStr
  return (
    <div className={cn('rounded border p-2', changed ? 'border-accent/30 bg-accent/[0.04]' : 'border-border')}>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
        {label}
        {changed && <span className="ml-2 text-accent">alterado</span>}
      </p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <p className="mb-1 text-[10px] text-fg-tertiary">anterior</p>
          <pre className={cn('whitespace-pre-wrap break-words font-sans', changed ? 'text-fg-secondary line-through decoration-danger/40' : 'text-fg-secondary')}>
            {prevStr}
          </pre>
        </div>
        <div>
          <p className="mb-1 text-[10px] text-fg-tertiary">atual</p>
          <pre className={cn('whitespace-pre-wrap break-words font-sans', changed ? 'text-fg font-medium' : 'text-fg-secondary')}>
            {currStr}
          </pre>
        </div>
      </div>
    </div>
  )
}

function SalesSheetDiff({ prev, curr }: { prev: any; curr: any }) {
  const p = prev ?? {}
  const c = curr ?? {}
  return (
    <div className="space-y-2">
      {SHEET_FIELDS.map((f) => (
        <DiffRow key={f.key} label={f.label} prev={p[f.key]} curr={c[f.key]} isArray={f.isArray} />
      ))}
    </div>
  )
}

function PresentationDiff({
  prevSlides,
  currSlides,
}: {
  prevSlides: { order: number; content: any }[]
  currSlides: { order: number; content: any }[]
}) {
  const maxLen = Math.max(prevSlides.length, currSlides.length)
  const rows = Array.from({ length: maxLen }).map((_, i) => ({
    order: i,
    prev: prevSlides[i]?.content,
    curr: currSlides[i]?.content,
  }))

  return (
    <div className="space-y-3">
      {rows.map(({ order, prev, curr }) => (
        <div key={order} className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
            Slide {order + 1} — {curr?.type ?? prev?.type ?? '—'}
          </p>
          <DiffRow label="Título" prev={prev?.title} curr={curr?.title} />
          {(prev?.subtitle || curr?.subtitle) && (
            <DiffRow label="Subtítulo" prev={prev?.subtitle} curr={curr?.subtitle} />
          )}
          {(prev?.body?.length || curr?.body?.length) && (
            <DiffRow label="Corpo" prev={prev?.body} curr={curr?.body} isArray />
          )}
        </div>
      ))}
    </div>
  )
}
