'use client'

import { useState } from 'react'
import type { QAResult, QACheckLevel } from '@/lib/hooks/use-qa'
import { cn } from '@/lib/utils'
import { ShieldCheck, ShieldAlert, Loader2, ChevronDown, ChevronUp } from 'lucide-react'

const LEVEL_COLOR: Record<QACheckLevel, string> = {
  ERROR:   'text-red-400',
  WARNING: 'text-yellow-400',
  INFO:    'text-blue-400',
}

interface QAPanelProps {
  onRun: () => Promise<QAResult>
  isRunning: boolean
}

export function QAPanel({ onRun, isRunning }: QAPanelProps) {
  const [result, setResult] = useState<QAResult | null>(null)
  const [expanded, setExpanded] = useState(false)

  async function run() {
    const r = await onRun()
    setResult(r)
    setExpanded(true)
  }

  const errors   = result?.checks.filter((c) => !c.passed && c.level === 'ERROR').length ?? 0
  const warnings = result?.checks.filter((c) => !c.passed && c.level === 'WARNING').length ?? 0

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QA / Validação</p>
        {result && (
          <span className={cn(
            'text-xs font-bold rounded-full border px-2.5 py-0.5',
            result.passed ? 'text-green-400 border-green-400/30' : 'text-red-400 border-red-400/30',
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
              ? <ShieldCheck className="h-5 w-5 text-green-400 shrink-0" />
              : <ShieldAlert className="h-5 w-5 text-red-400 shrink-0" />
            }
            <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
              {result.passed ? 'Aprovado' : `${errors} erro(s), ${warnings} aviso(s)`}
            </span>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>Detalhes ({result.checks.length} verificações)</span>
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {expanded && (
            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {result.checks.map((c, i) => (
                <div key={i} className="flex items-start gap-2 text-xs">
                  <span className={cn('mt-0.5 shrink-0', c.passed ? 'text-green-400' : LEVEL_COLOR[c.level])}>
                    {c.passed ? '✓' : c.level === 'ERROR' ? '✗' : '⚠'}
                  </span>
                  <span className={c.passed ? 'text-muted-foreground' : 'text-foreground'}>{c.message}</span>
                </div>
              ))}
              {result.aiFindings.length > 0 && (
                <div className="mt-2 border-t border-border/50 pt-2 space-y-1">
                  <p className="text-xs text-muted-foreground font-medium">Análise IA:</p>
                  {result.aiFindings.map((f, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <span className="text-yellow-400 shrink-0">⚠</span>
                      <span>{f}</span>
                    </div>
                  ))}
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
