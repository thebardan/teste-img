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
  visualSystem?: {
    palette?: { background?: string; backgroundSecondary?: string; dominant?: string; accent?: string }
    background?: { type?: string; colors?: string[]; angle?: number }
    mood?: { style?: string }
  }
  visualDirection?: {
    colors?: string[]
    style?: string
  }
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

function paletteColors(v: Variation): string[] {
  const vs = v.visualSystem
  if (vs?.palette) {
    return [vs.palette.background, vs.palette.backgroundSecondary, vs.palette.dominant, vs.palette.accent].filter(Boolean) as string[]
  }
  if (v.visualDirection?.colors?.length) return v.visualDirection.colors
  return ['#1a1a2e', '#16213e', '#0f3460']
}

function gradientFor(v: Variation): string {
  const colors = paletteColors(v)
  const angle = v.visualSystem?.background?.angle ?? 135
  const type = v.visualSystem?.background?.type
  if (type === 'gradient-radial') return `radial-gradient(circle at 30% 30%, ${colors.join(', ')})`
  if (type === 'solid') return colors[0]
  return `linear-gradient(${angle}deg, ${colors.join(', ')})`
}

export function VariationSelector({ variations, selectedIndex, onSelect, className }: VariationSelectorProps) {
  if (!variations?.length) return null

  return (
    <div className={cn('grid grid-cols-1 gap-3 sm:grid-cols-3', className)}>
      {variations.map((v, i) => {
        const config = APPROACH_CONFIG[v.copy.approach] ?? APPROACH_CONFIG.emotional
        const Icon = config.icon
        const isSelected = i === selectedIndex
        const palette = paletteColors(v)
        const styleName = v.visualSystem?.mood?.style ?? v.visualDirection?.style

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
            {/* Visual swatch */}
            <div
              className="h-10 w-full rounded-micro mb-2 border border-border"
              style={{ background: gradientFor(v) }}
            />

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

            {/* Color chips */}
            <div className="flex gap-1 mb-2">
              {palette.slice(0, 4).map((c, idx) => (
                <div
                  key={idx}
                  className="h-3 w-3 rounded-full border border-border/50"
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
              {styleName && (
                <span className="ml-auto text-nano text-fg-tertiary uppercase tracking-wider">
                  {styleName}
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
