'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RefreshCw, Sparkles, ChevronDown } from 'lucide-react'

interface CanvasToolbarProps {
  onRegenerate?: (field: 'headline' | 'subtitle' | 'benefits' | 'cta', guidance?: string) => void
  onGenerateMoreVariations?: (guidance?: string) => void
  isRegenerating?: boolean
  isGeneratingMore?: boolean
  orientation?: string
  onToggleOrientation?: () => void
  className?: string
}

const FIELD_LABELS = {
  headline: 'headline',
  subtitle: 'subtítulo',
  benefits: 'benefícios',
  cta: 'CTA',
} as const

export function CanvasToolbar({
  onRegenerate,
  onGenerateMoreVariations,
  isRegenerating,
  isGeneratingMore,
  className,
}: CanvasToolbarProps) {
  const [openField, setOpenField] = useState<keyof typeof FIELD_LABELS | null>(null)
  const [openMore, setOpenMore] = useState(false)
  const [guidance, setGuidance] = useState('')

  function submit(field: keyof typeof FIELD_LABELS) {
    onRegenerate?.(field, guidance.trim() || undefined)
    setOpenField(null)
    setGuidance('')
  }

  function submitMore() {
    onGenerateMoreVariations?.(guidance.trim() || undefined)
    setOpenMore(false)
    setGuidance('')
  }

  return (
    <div className={`flex items-center gap-2 flex-wrap ${className ?? ''}`}>
      {(['headline', 'subtitle', 'benefits', 'cta'] as const).map((field) => (
        <div key={field} className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpenField(openField === field ? null : field)}
            loading={isRegenerating && openField === field}
            className="text-xs"
          >
            <RefreshCw className="h-3 w-3" /> Regenerar {FIELD_LABELS[field]}
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
          {openField === field && (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-border bg-surface p-2 shadow-elevated space-y-2">
              <textarea
                autoFocus
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder="Orientação (opcional): ex: mais agressivo, tom premium..."
                rows={2}
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-accent resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={() => submit(field)} className="flex-1">
                  Regenerar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOpenField(null)
                    setGuidance('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      ))}

      {onGenerateMoreVariations && (
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setOpenMore(!openMore)}
            loading={isGeneratingMore}
            className="text-xs"
          >
            <Sparkles className="h-3 w-3" /> Mais variações
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
          {openMore && (
            <div className="absolute left-0 top-full z-20 mt-1 w-72 rounded-md border border-border bg-surface p-2 shadow-elevated space-y-2">
              <textarea
                autoFocus
                value={guidance}
                onChange={(e) => setGuidance(e.target.value)}
                placeholder="Orientação: ex: tom B2B, foco em economia..."
                rows={2}
                className="w-full rounded border border-border bg-background px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-accent resize-none"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={submitMore} className="flex-1">
                  Gerar 3 variações
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOpenMore(false)
                    setGuidance('')
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
