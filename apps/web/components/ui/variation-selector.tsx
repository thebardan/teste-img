'use client'

import { cn } from '@/lib/utils'
import { Badge } from './badge'
import { Sparkles, Brain, Star } from 'lucide-react'

export interface CopyVariation {
  approach: 'emotional' | 'rational' | 'aspirational'
  headline: string
  subtitle: string
  benefits: string[]
  cta: string
}

export interface Variation {
  copy: CopyVariation
  qaScore?: number
  layout?: { composition: string }
}

interface VariationSelectorProps {
  variations: Variation[]
  selectedIndex: number
  onSelect: (index: number) => void
  className?: string
}

const APPROACH_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'accent' | 'success' | 'warning' }> = {
  emotional:    { label: 'Emocional',    icon: Sparkles, variant: 'warning' },
  rational:     { label: 'Racional',     icon: Brain,    variant: 'accent' },
  aspirational: { label: 'Aspiracional', icon: Star,     variant: 'success' },
}

export function VariationSelector({ variations, selectedIndex, onSelect, className }: VariationSelectorProps) {
  if (!variations?.length) return null

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
      {variations.map((v, i) => {
        const config = APPROACH_CONFIG[v.copy.approach] ?? APPROACH_CONFIG.emotional
        const Icon = config.icon
        const isSelected = i === selectedIndex

        return (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              'rounded-standard p-4 text-left transition-all',
              isSelected
                ? 'bg-accent/[0.08] ring-2 ring-accent shadow-card'
                : 'bg-surface hover:shadow-card hover:bg-black/[0.02] dark:hover:bg-white/[0.04]',
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
              <Badge variant={config.variant}>
                <Icon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
              {v.qaScore != null && (
                <span className={cn(
                  'text-nano font-mono font-medium',
                  v.qaScore >= 80 ? 'text-success' : v.qaScore >= 60 ? 'text-warning' : 'text-danger',
                )}>
                  QA {v.qaScore}
                </span>
              )}
            </div>

            {/* Headline preview */}
            <p className={cn(
              'text-caption font-semibold leading-tight line-clamp-2 mb-1',
              isSelected ? 'text-fg' : 'text-fg-secondary',
            )}>
              {v.copy.headline}
            </p>

            {/* Subtitle preview */}
            <p className="text-micro text-fg-tertiary line-clamp-1 mb-2">
              {v.copy.subtitle}
            </p>

            {/* Benefits count + CTA */}
            <div className="flex items-center justify-between">
              <span className="text-nano text-fg-tertiary">
                {v.copy.benefits.length} beneficios
              </span>
              <span className="text-nano text-accent truncate max-w-24">
                {v.copy.cta}
              </span>
            </div>

            {/* Layout composition */}
            {v.layout?.composition && (
              <p className="mt-1 text-nano text-fg-tertiary capitalize">
                {v.layout.composition.replace(/-/g, ' ')}
              </p>
            )}

            {/* Selected indicator */}
            {isSelected && (
              <div className="mt-2 text-center">
                <span className="text-nano font-medium text-accent">Selecionada</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
