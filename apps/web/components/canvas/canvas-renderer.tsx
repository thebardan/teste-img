'use client'

import { useRef, useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export interface ZoneConfig {
  x: string | number
  y: string | number
  width: string | number
  height: string | number
}

export interface ZonesConfig {
  [zoneName: string]: ZoneConfig
}

interface CanvasRendererProps {
  /** Width:Height ratio, e.g. 297/210 for A4 landscape, 210/297 for A4 portrait */
  aspectRatio: number
  /** Background colors from visual direction */
  bgColors?: string[]
  /** Background style: gradient or solid */
  bgStyle?: 'gradient' | 'solid' | 'gradient-radial' | 'mesh'
  /** Gradient angle in degrees (for linear) */
  bgAngle?: number
  /** Background texture overlay */
  bgTexture?: 'none' | 'noise' | 'grid' | 'dots'
  /** Optional image URL to use as canvas background (overrides bgColors) */
  bgImageUrl?: string
  /** Opacity of overlay over bg image (for text legibility) */
  bgImageOverlayOpacity?: number
  /** Zone configurations from template */
  zones: ZonesConfig
  /** Render content for each zone */
  renderZone: (zoneName: string, zone: ZoneConfig) => React.ReactNode
  className?: string
}

function parsePercent(val: string | number): number {
  if (typeof val === 'number') return val
  if (val.endsWith('%')) return parseFloat(val)
  return parseFloat(val)
}

export function CanvasRenderer({
  aspectRatio,
  bgColors,
  bgStyle = 'gradient',
  bgAngle = 135,
  bgTexture = 'none',
  bgImageUrl,
  bgImageOverlayOpacity = 0.2,
  zones,
  renderZone,
  className,
}: CanvasRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  // The "real" canvas dimensions in px (we render at this size and scale down)
  const CANVAS_W = 800
  const CANVAS_H = CANVAS_W / aspectRatio

  useEffect(() => {
    function fit() {
      if (!containerRef.current) return
      const parent = containerRef.current.parentElement
      if (!parent) return
      const available = parent.clientWidth
      setScale(Math.min(1, available / CANVAS_W))
    }
    fit()
    const ro = new ResizeObserver(fit)
    if (containerRef.current?.parentElement) {
      ro.observe(containerRef.current.parentElement)
    }
    return () => ro.disconnect()
  }, [CANVAS_W])

  const background = bgColors?.length
    ? bgStyle === 'solid'
      ? bgColors[0]
      : bgStyle === 'gradient-radial'
        ? `radial-gradient(circle at 30% 30%, ${bgColors.join(', ')})`
        : bgStyle === 'mesh'
          ? `radial-gradient(at 20% 20%, ${bgColors[0]} 0%, transparent 50%), radial-gradient(at 80% 30%, ${bgColors[1] ?? bgColors[0]} 0%, transparent 50%), radial-gradient(at 50% 80%, ${bgColors[2] ?? bgColors[0]} 0%, transparent 50%), ${bgColors[0]}`
          : `linear-gradient(${bgAngle}deg, ${bgColors.join(', ')})`
    : `linear-gradient(${bgAngle}deg, #1a1a2e, #16213e)`

  const textureOverlay =
    bgTexture === 'noise'
      ? 'url("data:image/svg+xml;utf8,<svg xmlns=\\"http://www.w3.org/2000/svg\\" width=\\"80\\" height=\\"80\\"><filter id=\\"n\\"><feTurbulence baseFrequency=\\"0.9\\"/></filter><rect width=\\"100%\\" height=\\"100%\\" filter=\\"url(%23n)\\" opacity=\\"0.25\\"/></svg>")'
      : bgTexture === 'grid'
        ? 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)'
        : bgTexture === 'dots'
          ? 'radial-gradient(rgba(255,255,255,0.12) 1px, transparent 1px)'
          : null
  const textureSize =
    bgTexture === 'grid' ? '24px 24px' : bgTexture === 'dots' ? '16px 16px' : undefined

  return (
    <div
      className={cn('relative w-full', className)}
      style={{ height: CANVAS_H * scale }}
    >
      <div
        ref={containerRef}
        className="absolute left-1/2 top-0 origin-top-left overflow-hidden rounded-lg shadow-drop-lg ring-1 ring-black/5"
        style={{
          width: CANVAS_W,
          height: CANVAS_H,
          transform: `scale(${scale}) translateX(-50%)`,
          transformOrigin: 'top center',
          background,
        }}
      >
        {bgImageUrl && (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${bgImageUrl})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0 bg-black" style={{ opacity: bgImageOverlayOpacity }} />
          </>
        )}
        {textureOverlay && !bgImageUrl && (
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage: textureOverlay,
              backgroundSize: textureSize,
              opacity: 0.6,
              mixBlendMode: 'overlay',
            }}
          />
        )}
        {Object.entries(zones).map(([name, zone]) => {
          const left = parsePercent(zone.x)
          const top = parsePercent(zone.y)
          const width = parsePercent(zone.width)
          const height = parsePercent(zone.height)

          return (
            <div
              key={name}
              className="absolute"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: `${width}%`,
                height: `${height}%`,
              }}
            >
              {renderZone(name, zone)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
