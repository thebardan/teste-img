'use client'

import { useState } from 'react'
import { useQueueStats, useFailedJobs, useRetryJob } from '@/lib/hooks/use-queue'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { StatCard } from '@/components/ui/stat-card'
import { Activity, Clock, CheckCircle2, XCircle, RefreshCw, Zap } from 'lucide-react'

export function JobsClient() {
  const { data: stats, isLoading } = useQueueStats()
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null)
  const { data: failedJobs, isLoading: loadingFailed } = useFailedJobs(selectedQueue ?? '')
  const retryJob = useRetryJob()

  const queues = stats ? Object.entries(stats) : []

  const totals = queues.reduce(
    (acc, [, s]) => ({
      waiting: acc.waiting + s.waiting,
      active: acc.active + s.active,
      completed: acc.completed + s.completed,
      failed: acc.failed + s.failed,
    }),
    { waiting: 0, active: 0, completed: 0, failed: 0 },
  )

  return (
    <div className="animate-slide-up">
      {/* Hero section — dark */}
      <section className="section-dark px-6 lg:px-10 py-16">
        <h1 className="text-hero font-semibold">Monitor de Jobs</h1>
        <p className="mt-2 text-body text-white/60">
          Acompanhe o status das filas de geração em tempo real
        </p>
      </section>

      {/* Stats */}
      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-5xl">
          {isLoading ? (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-28 rounded-standard" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
              <StatCard label="Aguardando" value={totals.waiting} icon={Clock} />
              <StatCard label="Ativos" value={totals.active} icon={Zap} />
              <StatCard label="Completos" value={totals.completed} icon={CheckCircle2} />
              <StatCard label="Falhados" value={totals.failed} icon={XCircle} />
            </div>
          )}
        </div>
      </section>

      {/* Queues detail */}
      <section className="px-6 lg:px-10 pb-10">
        <div className="max-w-5xl">
          <h2 className="text-tile font-semibold mb-4">Filas</h2>

          {isLoading ? (
            <div className="space-y-3 stagger">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-standard" />
              ))}
            </div>
          ) : queues.length === 0 ? (
            <EmptyState
              icon={Activity}
              title="Nenhuma fila encontrada"
              description="As filas aparecerão quando a API estiver conectada"
            />
          ) : (
            <div className="space-y-2 stagger">
              {queues.map(([name, s]) => (
                <button
                  key={name}
                  onClick={() => setSelectedQueue(selectedQueue === name ? null : name)}
                  className={cn(
                    'w-full text-left rounded-standard bg-surface px-4 py-3 transition-all hover:shadow-card',
                    selectedQueue === name && 'ring-2 ring-accent',
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-standard bg-accent/[0.08] text-accent">
                      <Activity className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-caption font-medium font-mono">{name}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-micro text-fg-tertiary">Aguardando</p>
                        <p className="text-caption font-medium">{s.waiting}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-micro text-fg-tertiary">Ativos</p>
                        <p className="text-caption font-medium">{s.active}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-micro text-fg-tertiary">Completos</p>
                        <p className="text-caption font-medium">{s.completed}</p>
                      </div>
                      {s.failed > 0 && (
                        <Badge variant="danger">{s.failed} falhado(s)</Badge>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Failed jobs detail */}
          {selectedQueue && (
            <div className="mt-6">
              <h3 className="text-body font-semibold mb-3">
                Jobs falhados — <span className="font-mono text-fg-secondary">{selectedQueue}</span>
              </h3>

              {loadingFailed ? (
                <div className="space-y-2 stagger">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-16 rounded-standard" />
                  ))}
                </div>
              ) : !failedJobs?.length ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nenhum job falhado"
                  description="Todos os jobs desta fila estão limpos"
                />
              ) : (
                <div className="space-y-2 stagger">
                  {failedJobs.map((job) => (
                    <div key={job.id} className="rounded-standard bg-surface px-4 py-3">
                      <div className="flex items-center gap-3">
                        <XCircle className="h-4 w-4 shrink-0 text-danger" />
                        <div className="flex-1 min-w-0">
                          <p className="text-caption font-medium font-mono">
                            Job #{job.id} — {job.name}
                          </p>
                          <p className="text-micro text-danger mt-0.5 truncate">
                            {job.failedReason}
                          </p>
                          <p className="text-nano text-fg-tertiary mt-0.5">
                            {new Date(job.finishedOn).toLocaleString('pt-BR')}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            retryJob.mutate({ queue: selectedQueue, jobId: job.id })
                          }}
                          loading={retryJob.isPending}
                        >
                          <RefreshCw className="h-3.5 w-3.5" /> Retry
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
