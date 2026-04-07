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
  bgStyle?: 'gradient' | 'solid'
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
    ? bgStyle === 'gradient'
      ? `linear-gradient(135deg, ${bgColors.join(', ')})`
      : bgColors[0]
    : 'linear-gradient(135deg, #1a1a2e, #16213e)'

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
