'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  useAllApprovals,
  useSubmitSalesSheet,
  useSubmitPresentation,
  useApproveSalesSheet,
  useApprovePresentation,
  useRejectSalesSheet,
  useRejectPresentation,
  useArchiveSalesSheet,
  useArchivePresentation,
} from '@/lib/hooks/use-approvals'
import type { ApprovalStatus } from '@/lib/hooks/use-approvals'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { CheckCircle2, XCircle, Archive, Send, Layers, Presentation, Clock, ChevronRight } from 'lucide-react'

type Tab = ApprovalStatus | 'all'

import { STATUS_BADGE_VARIANT as STATUS_BADGE, STATUS_LABELS } from '@/lib/constants'

const TABS: { value: Tab; label: string }[] = [
  { value: 'all',       label: 'Todos' },
  { value: 'IN_REVIEW', label: 'Em revisão' },
  { value: 'APPROVED',  label: 'Aprovados' },
  { value: 'REJECTED',  label: 'Rejeitados' },
  { value: 'DRAFT',     label: 'Rascunhos' },
  { value: 'ARCHIVED',  label: 'Arquivados' },
]

function QuickActions({ type, id, status }: { type: 'sheet' | 'presentation'; id: string; status: ApprovalStatus }) {
  const [comment, setComment] = useState('')
  const [showReject, setShowReject] = useState(false)

  const submitSheet    = useSubmitSalesSheet()
  const approveSheet   = useApproveSalesSheet()
  const rejectSheet    = useRejectSalesSheet()
  const archiveSheet   = useArchiveSalesSheet()
  const submitPres     = useSubmitPresentation()
  const approvePres    = useApprovePresentation()
  const rejectPres     = useRejectPresentation()
  const archivePres    = useArchivePresentation()

  const isSheet = type === 'sheet'
  const submit  = isSheet ? submitSheet  : submitPres
  const approve = isSheet ? approveSheet : approvePres
  const reject  = isSheet ? rejectSheet  : rejectPres
  const archive = isSheet ? archiveSheet : archivePres

  const busy = submit.isPending || approve.isPending || reject.isPending || archive.isPending

  async function handleReject() {
    if (!comment.trim()) return
    await reject.mutateAsync({ id, comment, annotations: [] })
    setShowReject(false)
    setComment('')
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {status === 'DRAFT' && (
        <button
          onClick={() => submit.mutateAsync({ id })}
          disabled={busy}
          className="flex items-center gap-1 rounded-comfortable border border-warning/30 px-2.5 py-1 text-micro text-warning hover:bg-warning/10 disabled:opacity-50 transition-colors"
        >
          <Send className="h-3 w-3" /> Enviar revisão
        </button>
      )}
      {status === 'IN_REVIEW' && !showReject && (
        <>
          <button
            onClick={() => approve.mutateAsync({ id })}
            disabled={busy}
            className="flex items-center gap-1 rounded-comfortable border border-success/30 px-2.5 py-1 text-micro text-success hover:bg-success/10 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" /> Aprovar
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={busy}
            className="flex items-center gap-1 rounded-comfortable border border-danger/30 px-2.5 py-1 text-micro text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-3 w-3" /> Rejeitar
          </button>
        </>
      )}
      {status === 'REJECTED' && (
        <button
          onClick={() => submit.mutateAsync({ id })}
          disabled={busy}
          className="flex items-center gap-1 rounded-comfortable border border-warning/30 px-2.5 py-1 text-micro text-warning hover:bg-warning/10 disabled:opacity-50 transition-colors"
        >
          <Send className="h-3 w-3" /> Reenviar
        </button>
      )}
      {status !== 'ARCHIVED' && (
        <button
          onClick={() => archive.mutateAsync({ id })}
          disabled={busy}
          className="flex items-center gap-1 rounded-comfortable border border-border px-2.5 py-1 text-micro text-fg-tertiary hover:bg-black/[0.04] dark:bg-white/[0.06] disabled:opacity-50 transition-colors"
        >
          <Archive className="h-3 w-3" /> Arquivar
        </button>
      )}

      {showReject && (
        <div className="mt-2 flex w-full items-center gap-2">
          <input
            autoFocus
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Motivo da rejeição..."
            className="flex-1 rounded-comfortable border border-border bg-btn-default px-3 py-1.5 text-micro outline-none focus:ring-2 focus:ring-accent placeholder:text-fg-tertiary"
          />
          <button
            onClick={handleReject}
            disabled={!comment.trim() || reject.isPending}
            className="rounded-comfortable border border-danger/30 px-3 py-1.5 text-micro text-danger hover:bg-danger/10 disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            onClick={() => { setShowReject(false); setComment('') }}
            className="text-micro text-fg-tertiary hover:text-fg"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  )
}

export function ApprovalsClient() {
  const [tab, setTab] = useState<Tab>('IN_REVIEW')
  const { data, isLoading } = useAllApprovals(tab === 'all' ? undefined : (tab as ApprovalStatus))

  const total = data?.total ?? 0

  return (
    <div className="animate-slide-up">
      {/* Hero section — dark */}
      <section className="section-dark px-6 lg:px-10 py-16">
        <h1 className="text-hero font-semibold">Aprovações</h1>
        <p className="mt-2 text-body text-white/60">{total} item(s) no fluxo de aprovação</p>
      </section>

      {/* Content */}
      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-5xl">
          {/* Tabs */}
          <div className="mb-6 flex gap-1 flex-wrap rounded-standard bg-black/[0.04] dark:bg-white/[0.06] p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  'rounded-comfortable px-3 py-1.5 text-caption transition-colors',
                  tab === t.value
                    ? 'bg-surface text-fg shadow-sm'
                    : 'text-fg-secondary hover:text-fg',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="space-y-3 stagger">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-standard" />
              ))}
            </div>
          ) : total === 0 ? (
            <EmptyState
              icon={Clock}
              title="Nenhum item neste estado"
              description="Itens aparecerão aqui conforme avançam no fluxo"
            />
          ) : (
            <div className="space-y-2 stagger">
              {data?.sheets.map((s) => (
                <div key={s.id} className="rounded-standard bg-surface px-4 py-3 transition-all hover:shadow-card">
                  <div className="flex items-center gap-3">
                    <Layers className="h-4 w-4 shrink-0 text-fg-tertiary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/sales-sheets/${s.id}`} className="font-medium text-caption hover:text-accent truncate transition-colors">
                          {s.title}
                        </Link>
                        <Badge variant={STATUS_BADGE[s.status]}>
                          {STATUS_LABELS[s.status]}
                        </Badge>
                      </div>
                      <p className="text-micro text-fg-secondary mt-0.5">
                        Lâmina · {s.product.name} · {s.author.name} · {new Date(s.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Link href={`/sales-sheets/${s.id}`} className="shrink-0">
                      <ChevronRight className="h-4 w-4 text-fg-tertiary" />
                    </Link>
                  </div>
                  <div className="mt-3 pl-7">
                    <QuickActions type="sheet" id={s.id} status={s.status} />
                  </div>
                </div>
              ))}

              {data?.presentations.map((p) => (
                <div key={p.id} className="rounded-standard bg-surface px-4 py-3 transition-all hover:shadow-card">
                  <div className="flex items-center gap-3">
                    <Presentation className="h-4 w-4 shrink-0 text-fg-tertiary" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/presentations/${p.id}`} className="font-medium text-caption hover:text-accent truncate transition-colors">
                          {p.title}
                        </Link>
                        <Badge variant={STATUS_BADGE[p.status]}>
                          {STATUS_LABELS[p.status]}
                        </Badge>
                      </div>
                      <p className="text-micro text-fg-secondary mt-0.5">
                        Apresentação · {p.client?.name ?? 'Sem cliente'} · {p.author.name} · {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <Link href={`/presentations/${p.id}`} className="shrink-0">
                      <ChevronRight className="h-4 w-4 text-fg-tertiary" />
                    </Link>
                  </div>
                  <div className="mt-3 pl-7">
                    <QuickActions type="presentation" id={p.id} status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
