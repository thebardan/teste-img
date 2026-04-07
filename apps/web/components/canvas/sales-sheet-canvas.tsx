'use client'

import { cn } from '@/lib/utils'
import { CanvasRenderer, type ZonesConfig } from './canvas-renderer'

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
  orientation?: 'landscape' | 'portrait'
  className?: string
}

export function SalesSheetCanvas({
  content,
  zonesConfig,
  productImageUrl,
  orientation = 'landscape',
  className,
}: SalesSheetCanvasProps) {
  const aspectRatio = orientation === 'landscape' ? 297 / 210 : 210 / 297
  const colors = content.visualDirection?.colors ?? ['#1a1a2e', '#16213e', '#0f3460']

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
              return <ImageZone src={productImageUrl} />
            case 'headlineZone':
              return <HeadlineZone headline={content.headline} subtitle={content.subtitle} />
            case 'benefitsZone':
              return <BenefitsZone benefits={content.benefits} />
            case 'ctaZone':
              return <CTAZone cta={content.cta} />
            case 'logoZone':
              return <LogoZone logoUrl={content.logoUrl} />
            case 'qrZone':
              return <QRZone qrUrl={content.qrUrl} />
            case 'specsZone':
              return <SpecsZone />
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

function ImageZone({ src }: { src?: string }) {
  return (
    <div className="h-full w-full flex items-center justify-center overflow-hidden">
      {src ? (
        <img src={src} alt="Produto" className="h-full w-full object-contain drop-shadow-2xl p-4" />
      ) : (
        <div className="flex flex-col items-center gap-2 text-white/40">
          <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span className="text-xs font-medium">Imagem do Produto</span>
        </div>
      )}
    </div>
  )
}

function HeadlineZone({ headline, subtitle }: { headline?: string; subtitle?: string }) {
  return (
    <div className="flex h-full flex-col justify-center px-2">
      <h2 className="text-lg font-extrabold leading-tight text-white drop-shadow-md" style={{ fontSize: 'clamp(14px, 2.5vw, 22px)' }}>
        {headline || 'Headline do Produto'}
      </h2>
      {subtitle && (
        <p className="mt-1 text-xs text-white/75 leading-snug" style={{ fontSize: 'clamp(9px, 1.3vw, 12px)' }}>
          {subtitle}
        </p>
      )}
    </div>
  )
}

function BenefitsZone({ benefits }: { benefits?: string[] }) {
  const items = benefits?.length ? benefits : ['Beneficio 1', 'Beneficio 2', 'Beneficio 3']
  return (
    <div className="flex h-full flex-col justify-center px-2">
      <ul className="space-y-1.5">
        {items.map((b, i) => (
          <li key={i} className="flex items-start gap-1.5">
            <span className="mt-1 flex h-3 w-3 shrink-0 items-center justify-center rounded-full bg-white/20">
              <span className="h-1 w-1 rounded-full bg-white" />
            </span>
            <span className="text-white/90 leading-snug" style={{ fontSize: 'clamp(8px, 1.2vw, 11px)' }}>
              {b}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CTAZone({ cta }: { cta?: string }) {
  return (
    <div className="flex h-full items-center justify-center px-2">
      <div className="rounded-md bg-white/20 backdrop-blur-sm px-4 py-1.5 text-center">
        <span className="font-bold text-white" style={{ fontSize: 'clamp(8px, 1.3vw, 12px)' }}>
          {cta || 'Saiba Mais'}
        </span>
      </div>
    </div>
  )
}

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

function QRZone({ qrUrl }: { qrUrl?: string }) {
  return (
    <div className="flex h-full items-center justify-center p-1">
      <div className="flex flex-col items-center gap-1">
        <div className="rounded bg-white p-1.5">
          <div className="grid grid-cols-4 gap-[2px]">
            {Array.from({ length: 16 }).map((_, i) => (
              <div key={i} className={cn('h-1.5 w-1.5 rounded-[1px]', Math.random() > 0.3 ? 'bg-gray-900' : 'bg-white')} />
            ))}
          </div>
        </div>
        {qrUrl && <span className="text-[7px] text-white/50 truncate max-w-full">QR Code</span>}
      </div>
    </div>
  )
}

function SpecsZone() {
  return (
    <div className="flex h-full flex-col justify-center px-2">
      <p className="text-[9px] font-bold text-white/70 uppercase tracking-wider mb-1">Especificacoes</p>
      <div className="space-y-0.5">
        {['Dim: 00x00x00mm', 'Peso: 0,0 kg', 'Cor: —'].map((spec, i) => (
          <p key={i} className="text-[8px] text-white/50">{spec}</p>
        ))}
      </div>
    </div>
  )
}

function ComparativeZone() {
  return (
    <div className="flex h-full items-center justify-center px-2">
      <div className="rounded border border-white/10 bg-white/5 px-3 py-2 text-center">
        <p className="text-[8px] text-white/50">Comparativo</p>
      </div>
    </div>
  )
}

function GenericZone({ name }: { name: string }) {
  return (
    <div className="flex h-full items-center justify-center border border-dashed border-white/10 rounded">
      <span className="text-[8px] text-white/30 uppercase tracking-wider">{name.replace('Zone', '')}</span>
    </div>
  )
}
