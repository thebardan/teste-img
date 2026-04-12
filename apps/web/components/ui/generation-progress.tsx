'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { Check, Loader2, Sparkles, Palette, Image, Shield, FileCheck, Layout, CheckCircle2 } from 'lucide-react'

export interface GenerationStep {
  id: string
  label: string
  icon: React.ElementType
}

const SALES_SHEET_STEPS: GenerationStep[] = [
  { id: 'copy', label: 'Criando 3 variações de copy...', icon: Sparkles },
  { id: 'visual', label: 'Gerando sistema visual único...', icon: Palette },
  { id: 'layout', label: 'Calculando composições de layout...', icon: Layout },
  { id: 'logo', label: 'Selecionando logo ideal...', icon: Shield },
  { id: 'qa', label: 'Validando qualidade visual...', icon: CheckCircle2 },
  { id: 'save', label: 'Salvando 3 variações...', icon: FileCheck },
]

const PRESENTATION_STEPS: GenerationStep[] = [
  { id: 'structure', label: 'Planejando estrutura dos slides...', icon: Sparkles },
  { id: 'copy', label: 'Enriquecendo copy de cada slide...', icon: Sparkles },
  { id: 'logo', label: 'Selecionando logo...', icon: Shield },
  { id: 'compose', label: 'Montando apresentação...', icon: Image },
  { id: 'save', label: 'Salvando resultado...', icon: FileCheck },
]

interface GenerationProgressProps {
  type: 'sales-sheet' | 'presentation'
  isGenerating: boolean
  error?: string | null
  className?: string
}

export function GenerationProgress({ type, isGenerating, error, className }: GenerationProgressProps) {
  const steps = type === 'sales-sheet' ? SALES_SHEET_STEPS : PRESENTATION_STEPS
  const [currentStep, setCurrentStep] = useState(0)

  useEffect(() => {
    if (!isGenerating) {
      setCurrentStep(0)
      return
    }

    // Simulate step progression based on typical generation timing
    const timings = type === 'sales-sheet'
      ? [0, 2000, 5000, 8000, 10000]
      : [0, 3000, 8000, 12000, 14000]

    const timers = timings.map((delay, i) =>
      setTimeout(() => setCurrentStep(i), delay)
    )

    return () => timers.forEach(clearTimeout)
  }, [isGenerating, type])

  if (!isGenerating && !error) return null

  return (
    <div className={cn('rounded-standard bg-surface p-4 space-y-3 animate-fade-in', className)}>
      <div className="flex items-center gap-2 mb-3">
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
        <span className="text-caption font-medium">
          {error ? 'Erro na geração' : 'Gerando com IA...'}
        </span>
      </div>

      <div className="space-y-2">
        {steps.map((step, i) => {
          const Icon = step.icon
          const isComplete = i < currentStep
          const isCurrent = i === currentStep && isGenerating
          const isPending = i > currentStep

          return (
            <div
              key={step.id}
              className={cn(
                'flex items-center gap-3 rounded-comfortable px-3 py-2 transition-all duration-300',
                isComplete && 'bg-success/[0.06]',
                isCurrent && 'bg-accent/[0.06]',
                isPending && 'opacity-40',
              )}
            >
              <div className={cn(
                'flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-all',
                isComplete && 'bg-success/20 text-success',
                isCurrent && 'bg-accent/20 text-accent',
                isPending && 'bg-black/[0.04] dark:bg-white/[0.06] text-fg-tertiary',
              )}>
                {isComplete ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isCurrent ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Icon className="h-3.5 w-3.5" />
                )}
              </div>
              <span className={cn(
                'text-micro transition-colors',
                isComplete && 'text-success',
                isCurrent && 'text-fg font-medium',
                isPending && 'text-fg-tertiary',
              )}>
                {isComplete ? step.label.replace('...', ' ✓') : step.label}
              </span>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="mt-2 rounded-comfortable bg-danger/10 px-3 py-2 text-micro text-danger">
          {error}
        </div>
      )}
    </div>
  )
}
