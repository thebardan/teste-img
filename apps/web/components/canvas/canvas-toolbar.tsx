'use client'

import { Button } from '@/components/ui/button'
import { RefreshCw, Maximize2, Minimize2, Palette } from 'lucide-react'

interface CanvasToolbarProps {
  onRegenerateHeadline?: () => void
  onRegenerateBenefits?: () => void
  isRegenerating?: boolean
  orientation?: string
  onToggleOrientation?: () => void
  className?: string
}

export function CanvasToolbar({
  onRegenerateHeadline,
  onRegenerateBenefits,
  isRegenerating,
  className,
}: CanvasToolbarProps) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className ?? ''}`}>
      {onRegenerateHeadline && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerateHeadline}
          loading={isRegenerating}
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Regenerar headline
        </Button>
      )}
      {onRegenerateBenefits && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onRegenerateBenefits}
          loading={isRegenerating}
          className="text-xs"
        >
          <RefreshCw className="h-3 w-3" />
          Regenerar beneficios
        </Button>
      )}
    </div>
  )
}
