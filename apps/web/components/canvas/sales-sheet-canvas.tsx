'use client'

import { useState, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { CanvasRenderer, type ZonesConfig } from './canvas-renderer'
import QRCode from 'qrcode'

export interface ProductSpec {
  key: string
  value: string
  unit?: string
}

export interface SalesSheetContent {
  headline?: string
  subtitle?: string
  benefits?: string[]
  cta?: string
  qrUrl?: string
  logoUrl?: string
  visualDirection?: {
    style?: string
    colors?: string[]
    background?: string
    imageAmbiance?: string
    emotionalTone?: string
  }
}

interface SalesSheetCanvasProps {
  content: SalesSheetContent
  zonesConfig: ZonesConfig
  productImageUrl?: string
  productImageUrls?: string[]
  productSpecs?: ProductSpec[]
  orientation?: 'landscape' | 'portrait'
  editable?: boolean
  onContentChange?: (field: string, value: any) => void
  className?: string
}

export function SalesSheetCanvas({
  content,
  zonesConfig,
  productImageUrl,
  productImageUrls,
  productSpecs,
  orientation = 'landscape',
  editable = false,
  onContentChange,
  className,
}: SalesSheetCanvasProps) {
  const aspectRatio = orientation === 'landscape' ? 297 / 210 : 210 / 297
  const colors = content.visualDirection?.colors ?? ['#1a1a2e', '#16213e', '#0f3460']
  const allImages = productImageUrls?.length ? productImageUrls : productImageUrl ? [productImageUrl] : []

  return (
    <div className={cn('w-full', className)}>
      <CanvasRenderer
        aspectRatio={aspectRatio}
        bgColors={colors}
        bgStyle="gradient"
        zones={zonesConfig}
        renderZone={(name) => {
          switch (name) {
            case 'imageZone':
              return <ImageZone images={allImages} />
            case 'headlineZone':
              return (
                <HeadlineZone
                  headline={content.headline}
                  subtitle={content.subtitle}
                  editable={editable}
                  onHeadlineChange={(v) => onContentChange?.('headline', v)}
                  onSubtitleChange={(v) => onContentChange?.('subtitle', v)}
                />
              )
            case 'benefitsZone':
              return (
                <BenefitsZone
                  benefits={content.benefits}
                  editable={editable}
                  onChange={(v) => onContentChange?.('benefits', v)}
                />
              )
            case 'ctaZone':
              return (
                <CTAZone
                  cta={content.cta}
                  editable={editable}
                  onChange={(v) => onContentChange?.('cta', v)}
                />
              )
            case 'logoZone':
              return <LogoZone logoUrl={content.logoUrl} />
            case 'qrZone':
              return <RealQRZone qrUrl={content.qrUrl} />
            case 'specsZone':
              return <SpecsZone specs={productSpecs} />
            case 'comparativeZone':
              return <ComparativeZone />
            default:
              return <GenericZone name={name} />
          }
        }}
      />
    </div>
  )
}

// ─── Editable Text ────────────────────────────────────────────────────────────

function EditableText({
  value,
  onChange,
  editable,
  className,
  style,
  placeholder,
  multiline,
}: {
  value: string
  onChange?: (v: string) => void
  editable?: boolean
  className?: string
  style?: React.CSSProperties
  placeholder?: string
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null)

  useEffect(() => { setDraft(value) }, [value])

  if (!editable || !editing) {
    return (
      <span
        className={cn(className, editable && 'cursor-text hover:ring-1 hover:ring-white/20 rounded px-0.5 -mx-0.5 transition-all')}
        style={style}
        onClick={() => { if (editable) setEditing(true) }}
        title={editable ? 'Clique para editar' : undefined}
      >
        {value || placeholder}
      </span>
    )
  }

  function commit() {
    setEditing(false)
    if (draft !== value) onChange?.(draft)
  }

  const Tag = multiline ? 'textarea' : 'input'

  return (
    <Tag
      ref={inputRef as any}
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter' && !multiline) commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false) } }}
      className={cn('bg-transparent border-none outline-none ring-1 ring-white/30 rounded px-0.5 -mx-0.5 w-full', className)}
      style={style}
    />
  )
}

// ─── Image Zone ───────────────────────────────────────────────────────────────

function ImageZone({ images }: { images: string[] }) {
  if (!images.length) {
    return (
      <div className="h-full w-full flex items-center justify-center overflow-hidden">
        <div className="flex flex-col items-center gap-2 text-white/40">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium">Imagem do Produto</span>
        </div>
      </div>
    )
  }

  if (images.length === 1) {
    return (
      <div className="h-full w-full flex items-center justify-center overflow-hidden">
        <img src={images[0]} alt="Produto" className="h-full w-full object-contain drop-shadow-2xl p-4" />
      </div>
    )
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center overflow-hidden p-2 gap-2">
      <div className="flex-1 flex items-center justify-center min-h-0">
        <img src={images[0]} alt="Produto" className="max-h-full max-w-full object-contain drop-shadow-2xl" />
      </div>
      <div className="flex gap-1 shrink-0">
        {images.slice(1, 4).map((url, i) => (
          <div key={i} className="h-8 w-8 rounded bg-white/10 overflow-hidden flex items-center justify-center">
            <img src={url} alt="" className="h-full w-full object-contain" />
          </div>
        ))}
        {images.length > 4 && (
          <div className="h-8 w-8 rounded bg-white/10 flex items-center justify-center">
            <span className="text-[8px] text-white/60">+{images.length - 4}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Headline Zone (editable) ─────────────────────────────────────────────────

function HeadlineZone({
  headline, subtitle, editable, onHeadlineChange, onSubtitleChange,
}: {
  headline?: string; subtitle?: string; editable?: boolean
  onHeadlineChange?: (v: string) => void; onSubtitleChange?: (v: string) => void
}) {
  return (
    <div className="flex h-full flex-col justify-center px-2">
      <EditableText
        value={headline || 'Headline do Produto'}
        onChange={onHeadlineChange}
        editable={editable}
        className="text-lg font-extrabold leading-tight text-white drop-shadow-md block"
        style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }}
      />
      {(subtitle || editable) && (
        <EditableText
          value={subtitle || ''}
          onChange={onSubtitleChange}
          editable={editable}
          className="mt-1 text-xs text-white/75 leading-snug block"
          style={{ fontSize: 'clamp(9px, 1.3vw, 12px)' }}
          placeholder="Subtítulo..."
        />
      )}
    </div>
  )
}

// ─── Benefits Zone (editable) ─────────────────────────────────────────────────

function BenefitsZone({
  benefits, editable, onChange,
}: {
  benefits?: string[]; editable?: boolean; onChange?: (v: string[]) => void
}) {
  const items = benefits?.length ? benefits : ['Benefício 1', 'Benefício 2', 'Benefício 3']

  function updateItem(index: number, value: string) {
    const next = [...items]
    next[index] = value
    onChange?.(next)
  }

  return (
    <div className="flex h-full flex-col justify-center px-2">
      <ul className="space-y-1.5">
        {items.map((b, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-white/20">
              <span className="h-1 w-1 rounded-full bg-white" />
            </span>
            <EditableText
              value={b}
              onChange={(v) => updateItem(i, v)}
              editable={editable}
              className="text-white/90 leading-snug"
              style={{ fontSize: 'clamp(8px, 1.2vw, 11px)' }}
            />
          </li>
        ))}
      </ul>
    </div>
  )
}

// ─── CTA Zone (editable) ──────────────────────────────────────────────────────

function CTAZone({
  cta, editable, onChange,
}: {
  cta?: string; editable?: boolean; onChange?: (v: string) => void
}) {
  return (
    <div className="flex h-full items-center justify-center px-2">
      <div className="rounded-md bg-white/20 backdrop-blur-sm px-4 py-1.5 text-center">
        <EditableText
          value={cta || 'Saiba Mais'}
          onChange={onChange}
          editable={editable}
          className="font-bold text-white"
          style={{ fontSize: 'clamp(8px, 1.3vw, 12px)' }}
        />
      </div>
    </div>
  )
}

// ─── Logo Zone ────────────────────────────────────────────────────────────────

function LogoZone({ logoUrl }: { logoUrl?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-1">
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="max-h-full max-w-full object-contain opacity-90" />
      ) : (
        <div className="rounded bg-white/15 px-2 py-1">
          <span className="text-[10px] font-bold text-white/70 tracking-wider">LOGO</span>
        </div>
      )}
    </div>
  )
}

// ─── Real QR Code Zone ────────────────────────────────────────────────────────

function RealQRZone({ qrUrl }: { qrUrl?: string }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!qrUrl) return
    QRCode.toDataURL(qrUrl, {
      width: 120,
      margin: 1,
      color: { dark: '#000000', light: '#FFFFFF' },
      errorCorrectionLevel: 'M',
    }).then(setDataUrl).catch(() => setDataUrl(null))
  }, [qrUrl])

  return (
    <div className="flex h-full items-center justify-center p-1">
      <div className="flex flex-col items-center gap-1">
        {dataUrl ? (
          <img src={dataUrl} alt="QR Code" className="rounded" style={{ maxHeight: '90%', maxWidth: '90%' }} />
        ) : (
          <div className="rounded bg-white/10 p-2">
            <span className="text-[8px] text-white/40">QR</span>
          </div>
        )}
        {qrUrl && <span className="text-[6px] text-white/40 truncate max-w-full">{qrUrl.replace(/^https?:\/\//, '').slice(0, 20)}</span>}
      </div>
    </div>
  )
}

// ─── Specs Zone (real data) ───────────────────────────────────────────────────

function SpecsZone({ specs }: { specs?: ProductSpec[] }) {
  const items = specs?.slice(0, 5) ?? []

  return (
    <div className="flex h-full flex-col justify-center px-2">
      <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider mb-1">Especificações</p>
      {items.length > 0 ? (
        <div className="space-y-0.5">
          {items.map((spec, i) => (
            <div key={i} className="flex justify-between gap-2" style={{ fontSize: 'clamp(7px, 1vw, 9px)' }}>
              <span className="text-white/50 truncate">{spec.key}</span>
              <span className="text-white/80 font-medium shrink-0">
                {spec.value}{spec.unit ? ` ${spec.unit}` : ''}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[8px] text-white/30 italic">Sem especificações</p>
      )}
    </div>
  )
}

// ─── Comparative Zone ─────────────────────────────────────────────────────────

function ComparativeZone() {
  return (
    <div className="flex h-full items-center justify-center px-2">
      <div className="rounded border border-white/10 bg-white/5 px-3 py-2 text-center">
        <p className="text-[8px] text-white/50">Comparativo</p>
      </div>
    </div>
  )
}

// ─── Generic Zone ─────────────────────────────────────────────────────────────

function GenericZone({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center border border-dashed border-white/10 rounded">
      <span className="text-[8px] text-white/30 uppercase tracking-wider">{name.replace('Zone', '')}</span>
    </div>
  )
}
