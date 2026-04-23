'use client'

import { cn } from '@/lib/utils'
import { CanvasRenderer, type ZonesConfig } from './canvas-renderer'
import { EditableText } from './editable-text'

export interface SlideContent {
  type: string
  title?: string
  subtitle?: string
  body?: string[]
  cta?: string | null
  logoUrl?: string | null
  visualDirection?: {
    colors?: string[]
    style?: string
  }
  visualSystem?: any
}

interface PresentationSlideCanvasProps {
  content: SlideContent
  zonesConfig?: ZonesConfig
  className?: string
  compact?: boolean
  editable?: boolean
  onContentChange?: (field: string, value: any) => void
}

const SLIDE_TYPE_LABELS: Record<string, string> = {
  cover: 'CAPA',
  context: 'CONTEXTO',
  products: 'PRODUTOS',
  benefits: 'BENEFICIOS',
  closing: 'ENCERRAMENTO',
}

export function PresentationSlideCanvas({
  content,
  zonesConfig,
  className,
  compact = false,
  editable = false,
  onContentChange,
}: PresentationSlideCanvasProps) {
  const vs: any = content.visualSystem
  const vsBg = vs?.background
  const vsPaletteColors = vs?.palette
    ? [vs.palette.background, vs.palette.backgroundSecondary, vs.palette.dominant].filter(Boolean)
    : null
  const colors = (vsPaletteColors && vsPaletteColors.length)
    ? vsPaletteColors
    : content.visualDirection?.colors ?? getDefaultColors(content.type)
  const bgStyleMap: Record<string, 'gradient' | 'solid' | 'gradient-radial' | 'mesh'> = {
    solid: 'solid',
    'gradient-linear': 'gradient',
    'gradient-radial': 'gradient-radial',
    mesh: 'mesh',
  }
  const bgStyle = (vsBg?.type && bgStyleMap[vsBg.type]) ?? 'gradient'
  const bgAngle = typeof vsBg?.angle === 'number' ? vsBg.angle : 135
  const bgTexture = (vsBg?.texture as 'none' | 'noise' | 'grid' | 'dots') ?? 'none'

  const renderer = (name: string) =>
    renderPresentationZone(name, content, compact, editable && !compact ? onContentChange : undefined)

  if (zonesConfig && Object.keys(zonesConfig).length > 0) {
    return (
      <div className={cn('w-full', className)}>
        <CanvasRenderer
          aspectRatio={16 / 9}
          bgColors={colors}
          bgStyle={bgStyle}
          bgAngle={bgAngle}
          bgTexture={bgTexture}
          zones={zonesConfig}
          renderZone={renderer}
        />
      </div>
    )
  }

  return (
    <div className={cn('w-full', className)}>
      <CanvasRenderer
        aspectRatio={16 / 9}
        bgColors={colors}
        bgStyle={bgStyle}
        bgAngle={bgAngle}
        bgTexture={bgTexture}
        zones={getDefaultSlideZones(content.type)}
        renderZone={renderer}
      />
    </div>
  )
}

function renderPresentationZone(
  name: string,
  content: SlideContent,
  compact: boolean,
  onContentChange?: (field: string, value: any) => void,
) {
  const scale = compact ? 0.7 : 1
  const editable = !!onContentChange

  switch (name) {
    case 'typeLabelZone':
      return (
        <div className="flex h-full items-center px-2">
          <span className="text-[8px] font-bold tracking-[3px] text-white/40 uppercase">
            {SLIDE_TYPE_LABELS[content.type] ?? content.type}
          </span>
        </div>
      )

    case 'titleZone':
      return (
        <div className="flex h-full flex-col justify-center px-3">
          {editable ? (
            <EditableText
              value={content.title ?? ''}
              onSave={(v) => onContentChange!('title', v)}
              tag="h2"
              className="font-extrabold leading-tight text-white drop-shadow-md"
              placeholder="Título do slide"
            />
          ) : (
            content.title && (
              <h2
                className="font-extrabold leading-tight text-white drop-shadow-md"
                style={{ fontSize: `clamp(${10 * scale}px, ${content.type === 'cover' ? 3.5 : 2.5}vw, ${(content.type === 'cover' ? 28 : 20) * scale}px)` }}
              >
                {content.title}
              </h2>
            )
          )}
        </div>
      )

    case 'taglineZone':
      return (
        <div className="flex h-full items-center px-3">
          {editable ? (
            <EditableText
              value={content.subtitle ?? ''}
              onSave={(v) => onContentChange!('subtitle', v)}
              tag="p"
              className="text-white/70 italic"
              placeholder="Subtítulo"
            />
          ) : (
            content.subtitle && (
              <p className="text-white/70 italic" style={{ fontSize: `clamp(${8 * scale}px, 1.3vw, ${12 * scale}px)` }}>
                {content.subtitle}
              </p>
            )
          )}
        </div>
      )

    case 'bodyZone':
      if (editable) {
        const body = content.body ?? []
        return (
          <div className="flex h-full flex-col justify-start px-3 pt-1 overflow-hidden">
            {body.map((item, i) => (
              <div key={i} className="flex items-start gap-1.5 mb-1">
                <span className="mt-1 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <span className="text-[7px] font-bold text-white/80">{i + 1}</span>
                </span>
                <EditableText
                  value={item}
                  onSave={(v) => {
                    const next = [...body]
                    if (v.trim()) next[i] = v
                    else next.splice(i, 1)
                    onContentChange!('body', next)
                  }}
                  tag="span"
                  className="text-white/85 leading-snug flex-1"
                  placeholder="Tópico"
                />
              </div>
            ))}
            <button
              onClick={() => onContentChange!('body', [...body, 'Novo tópico'])}
              className="mt-1 text-[9px] text-white/40 hover:text-white/80 text-left self-start"
            >
              + adicionar tópico
            </button>
          </div>
        )
      }
      return (
        <div className="flex h-full flex-col justify-start px-3 pt-1 overflow-hidden">
          {content.body?.map((item, i) => (
            <div key={i} className="flex items-start gap-1.5 mb-1">
              <span className="mt-1 flex h-2.5 w-2.5 shrink-0 items-center justify-center rounded-full bg-white/15">
                <span className="text-[7px] font-bold text-white/80">{i + 1}</span>
              </span>
              <span className="text-white/85 leading-snug" style={{ fontSize: `clamp(${7 * scale}px, 1.1vw, ${10 * scale}px)` }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      )

    case 'heroZone':
    case 'fullBleedZone':
    case 'headerZone':
      return (
        <div className="flex h-full items-end p-3 bg-white/5">
          {content.type === 'cover' && content.title && (
            <h2 className="text-xl font-extrabold text-white drop-shadow-lg" style={{ fontSize: 'clamp(14px, 3vw, 28px)' }}>
              {content.title}
            </h2>
          )}
        </div>
      )

    case 'ctaZone':
      if (editable) {
        return (
          <div className="flex h-full items-center justify-center px-2">
            <div className="rounded-md bg-white/20 backdrop-blur-sm px-4 py-1.5">
              <EditableText
                value={content.cta ?? ''}
                onSave={(v) => onContentChange!('cta', v || null)}
                tag="span"
                className="font-bold text-white"
                placeholder="CTA"
              />
            </div>
          </div>
        )
      }
      return content.cta ? (
        <div className="flex h-full items-center justify-center px-2">
          <div className="rounded-md bg-white/20 backdrop-blur-sm px-4 py-1.5">
            <span className="font-bold text-white" style={{ fontSize: `clamp(${7 * scale}px, 1.1vw, ${10 * scale}px)` }}>
              {content.cta}
            </span>
          </div>
        </div>
      ) : null

    case 'logoZone':
      return (
        <div className="flex h-full items-center px-2">
          {content.logoUrl ? (
            <img src={content.logoUrl} alt="Logo" className="max-h-full max-w-full object-contain" />
          ) : (
            <span className="text-[8px] font-bold text-white/40 tracking-[2px]">MULTILASER</span>
          )}
        </div>
      )

    case 'footerZone':
      return (
        <div className="flex h-full items-center justify-center bg-white/5">
          <span className="text-[7px] text-white/30">Multilaser — Confidencial</span>
        </div>
      )

    case 'accentBarZone':
      return <div className="h-full w-full bg-amber-400" />

    case 'col1Zone':
    case 'col2Zone':
    case 'col3Zone':
      return (
        <div className="flex h-full flex-col justify-start border border-dashed border-white/10 rounded p-2">
          <span className="text-[7px] text-white/30 uppercase">{name.replace('Zone', '')}</span>
          {content.body && (() => {
            const colIndex = parseInt(name.replace('col', '').replace('Zone', '')) - 1
            const itemsPerCol = Math.ceil((content.body.length) / 3)
            const colItems = content.body.slice(colIndex * itemsPerCol, (colIndex + 1) * itemsPerCol)
            return colItems.map((item, i) => (
              <p key={i} className="text-[8px] text-white/70 mt-1">{item}</p>
            ))
          })()}
        </div>
      )

    case 'highlightZone':
    case 'sidebarZone':
      return (
        <div className="flex h-full items-center justify-center rounded bg-white/5 p-2">
          <span className="text-[8px] text-white/30 uppercase">{name.replace('Zone', '')}</span>
        </div>
      )

    case 'qrZone':
      return (
        <div className="flex h-full items-center justify-center p-1">
          <div className="rounded bg-white p-1">
            <div className="grid grid-cols-3 gap-[1px]">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className={cn('h-1 w-1', Math.random() > 0.3 ? 'bg-gray-900' : 'bg-white')} />
              ))}
            </div>
          </div>
        </div>
      )

    default:
      return (
        <div className="flex h-full items-center justify-center border border-dashed border-white/10 rounded">
          <span className="text-[7px] text-white/20 uppercase">{name.replace('Zone', '')}</span>
        </div>
      )
  }
}

function getDefaultColors(type: string): string[] {
  const map: Record<string, string[]> = {
    cover: ['#111827', '#1a2332'],
    context: ['#1F2937', '#2d3a4a'],
    products: ['#111827', '#1c2634'],
    benefits: ['#1A2332', '#243040'],
    closing: ['#111827', '#1a2332'],
  }
  return map[type] ?? ['#111827', '#1a2332']
}

function getDefaultSlideZones(type: string): ZonesConfig {
  return {
    accentBarZone: { x: 0, y: 0, width: '100%', height: '1%' },
    typeLabelZone: { x: '3%', y: '2%', width: '30%', height: '5%' },
    titleZone: { x: '3%', y: '8%', width: '92%', height: '20%' },
    taglineZone: { x: '3%', y: '30%', width: '92%', height: '8%' },
    bodyZone: { x: '3%', y: '40%', width: '92%', height: '45%' },
    footerZone: { x: 0, y: '93%', width: '100%', height: '7%' },
  }
}
