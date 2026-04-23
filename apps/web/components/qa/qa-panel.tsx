'use client'

import { useState } from 'react'
import type { QAResult, QACheckLevel } from '@/lib/hooks/use-qa'
import { cn } from '@/lib/utils'
import { ShieldCheck, ShieldAlert, Loader2, ChevronDown, ChevronUp, Info, Lightbulb } from 'lucide-react'

const LEVEL_COLOR: Record<QACheckLevel, string> = {
  ERROR:   'text-danger',
  WARNING: 'text-warning',
  INFO:    'text-primary',
}

interface QAPanelProps {
  onRun: () => Promise<QAResult>
  isRunning: boolean
}

export function QAPanel({ onRun, isRunning }: QAPanelProps) {
  const [result, setResult] = useState<QAResult | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

  async function run() {
    const r = await onRun()
    setResult(r)
    setExpanded(true)
  }

  function toggleItem(key: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const errors   = result?.checks.filter((c) => !c.passed && c.level === 'ERROR').length ?? 0
  const warnings = result?.checks.filter((c) => !c.passed && c.level === 'WARNING').length ?? 0
  const aiErrors = result?.aiFindings.filter((f) => f.severity === 'ERROR').length ?? 0
  const aiWarnings = result?.aiFindings.filter((f) => f.severity === 'WARNING').length ?? 0

  return (
    <div className="rounded-lg bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-fg-secondary" />
          <h3 className="text-sm font-semibold">QA / Validação</h3>
        </div>
        {result && (
          <span className={cn(
            'text-xs font-bold rounded-full border px-2.5 py-0.5',
            result.passed ? 'text-success border-success/30' : 'text-danger border-danger/30',
          )}>
            {result.score}/100
          </span>
        )}
      </div>

      {!result ? (
        <button
          onClick={run}
          disabled={isRunning}
          className="w-full flex items-center justify-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/20 disabled:opacity-50 transition-colors"
        >
          {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          {isRunning ? 'Verificando...' : 'Executar QA'}
        </button>
      ) : (
        <>
          <div className="flex items-center gap-3 text-sm">
            {result.passed
              ? <ShieldCheck className="h-5 w-5 text-success shrink-0" />
              : <ShieldAlert className="h-5 w-5 text-danger shrink-0" />
            }
            <span className={result.passed ? 'text-success' : 'text-danger'}>
              {result.passed
                ? 'Aprovado'
                : `${errors + aiErrors} erro(s), ${warnings + aiWarnings} aviso(s)`}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Detalhes ({result.checks.length + result.aiFindings.length} verificações)</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {expanded && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {result.checks.map((c, i) => {
                const key = `check-${i}`
                const open = expandedItems.has(key)
                const hasDetails = !!c.explanation || !!c.fixSuggestion
                return (
                  <div key={key} className="text-xs rounded border border-border/40 bg-background/40">
                    <button
                      onClick={() => hasDetails && toggleItem(key)}
                      className={cn('flex w-full items-start gap-2 px-2 py-1.5 text-left', hasDetails && 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]')}
                    >
                      <span className={cn('mt-0.5 shrink-0', c.passed ? 'text-success' : LEVEL_COLOR[c.level])}>
                        {c.passed ? '✓' : c.level === 'ERROR' ? '✗' : '⚠'}
                      </span>
                      <div className="flex-1 min-w-0">
                        {c.targetField && (
                          <span className="mr-1.5 rounded bg-fg/10 px-1 py-0.5 text-[9px] font-medium">{c.targetField}</span>
                        )}
                        <span className={c.passed ? 'text-muted-foreground' : 'text-foreground'}>{c.message}</span>
                      </div>
                      {hasDetails && (open ? <ChevronUp className="h-3 w-3 text-fg-tertiary" /> : <ChevronDown className="h-3 w-3 text-fg-tertiary" />)}
                    </button>
                    {open && hasDetails && (
                      <div className="border-t border-border/40 px-2 py-1.5 space-y-1">
                        {c.explanation && (
                          <div className="flex items-start gap-1.5 text-[11px] text-fg-secondary">
                            <Info className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{c.explanation}</span>
                          </div>
                        )}
                        {c.fixSuggestion && (
                          <div className="flex items-start gap-1.5 text-[11px] text-accent">
                            <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{c.fixSuggestion}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {result.aiFindings.length > 0 && (
                <div className="mt-2 border-t border-border/50 pt-2 space-y-1.5">
                  <p className="text-xs text-muted-foreground font-medium">Análise IA:</p>
                  {result.aiFindings.map((f, i) => {
                    const key = `ai-${i}`
                    const open = expandedItems.has(key)
                    return (
                      <div key={key} className="text-xs rounded border border-border/40 bg-background/40">
                        <button
                          onClick={() => f.fixSuggestion && toggleItem(key)}
                          className={cn('flex w-full items-start gap-2 px-2 py-1.5 text-left', f.fixSuggestion && 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]')}
                        >
                          <span className={cn('shrink-0', LEVEL_COLOR[f.severity])}>
                            {f.severity === 'ERROR' ? '✗' : f.severity === 'WARNING' ? '⚠' : 'ℹ'}
                          </span>
                          <div className="flex-1 min-w-0">
                            {f.field && (
                              <span className="mr-1.5 rounded bg-fg/10 px-1 py-0.5 text-[9px] font-medium">{f.field}</span>
                            )}
                            <span>{f.message}</span>
                          </div>
                          {f.fixSuggestion && (open ? <ChevronUp className="h-3 w-3 text-fg-tertiary" /> : <ChevronDown className="h-3 w-3 text-fg-tertiary" />)}
                        </button>
                        {open && f.fixSuggestion && (
                          <div className="border-t border-border/40 px-2 py-1.5">
                            <div className="flex items-start gap-1.5 text-[11px] text-accent">
                              <Lightbulb className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{f.fixSuggestion}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          <button
            onClick={run}
            disabled={isRunning}
            className="w-full text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
          >
            {isRunning ? 'Verificando...' : 'Reexecutar QA'}
          </button>
        </>
      )}
    </div>
  )
}
