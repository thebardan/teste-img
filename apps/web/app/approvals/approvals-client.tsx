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
import { CheckCircle2, XCircle, Archive, Send, Layers, Presentation, Clock, ChevronRight } from 'lucide-react'

type Tab = ApprovalStatus | 'all'

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Rascunho',   color: 'text-muted-foreground border-border' },
  IN_REVIEW: { label: 'Em revisão', color: 'text-yellow-400 border-yellow-400/30' },
  APPROVED:  { label: 'Aprovado',   color: 'text-green-400 border-green-400/30' },
  REJECTED:  { label: 'Rejeitado',  color: 'text-red-400 border-red-400/30' },
  ARCHIVED:  { label: 'Arquivado',  color: 'text-muted-foreground/50 border-border/50' },
}

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
    await reject.mutateAsync({ id, comment })
    setShowReject(false)
    setComment('')
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {status === 'DRAFT' && (
        <button
          onClick={() => submit.mutateAsync({ id })}
          disabled={busy}
          className="flex items-center gap-1 rounded-md border border-yellow-400/30 px-2.5 py-1 text-xs text-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50 transition-colors"
        >
          <Send className="h-3 w-3" /> Enviar revisão
        </button>
      )}
      {status === 'IN_REVIEW' && !showReject && (
        <>
          <button
            onClick={() => approve.mutateAsync({ id })}
            disabled={busy}
            className="flex items-center gap-1 rounded-md border border-green-400/30 px-2.5 py-1 text-xs text-green-400 hover:bg-green-400/10 disabled:opacity-50 transition-colors"
          >
            <CheckCircle2 className="h-3 w-3" /> Aprovar
          </button>
          <button
            onClick={() => setShowReject(true)}
            disabled={busy}
            className="flex items-center gap-1 rounded-md border border-red-400/30 px-2.5 py-1 text-xs text-red-400 hover:bg-red-400/10 disabled:opacity-50 transition-colors"
          >
            <XCircle className="h-3 w-3" /> Rejeitar
          </button>
        </>
      )}
      {status === 'REJECTED' && (
        <button
          onClick={() => submit.mutateAsync({ id })}
          disabled={busy}
          className="flex items-center gap-1 rounded-md border border-yellow-400/30 px-2.5 py-1 text-xs text-yellow-400 hover:bg-yellow-400/10 disabled:opacity-50 transition-colors"
        >
          <Send className="h-3 w-3" /> Reenviar
        </button>
      )}
      {status !== 'ARCHIVED' && (
        <button
          onClick={() => archive.mutateAsync({ id })}
          disabled={busy}
          className="flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-muted/20 disabled:opacity-50 transition-colors"
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
            className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
          />
          <button
            onClick={handleReject}
            disabled={!comment.trim() || reject.isPending}
            className="rounded-md border border-red-400/30 px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            onClick={() => { setShowReject(false); setComment('') }}
            className="text-xs text-muted-foreground hover:text-foreground"
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
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Aprovações</h1>
        <p className="mt-1 text-sm text-muted-foreground">{total} item(s)</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 flex-wrap rounded-lg border border-border bg-muted/10 p-1 w-fit">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm transition-colors',
              tab === t.value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 rounded-lg border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Clock className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Nenhum item neste estado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data?.sheets.map((s) => {
            const st = STATUS_CONFIG[s.status]
            return (
              <div key={s.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <Layers className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/sales-sheets/${s.id}`} className="font-medium text-sm hover:text-primary truncate">
                        {s.title}
                      </Link>
                      <span className={cn('text-xs rounded-full border px-2 py-0.5 shrink-0', st.color)}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Lâmina · {s.product.name} · {s.author.name} · {new Date(s.updatedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Link href={`/sales-sheets/${s.id}`} className="shrink-0">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
                <div className="mt-3 pl-7">
                  <QuickActions type="sheet" id={s.id} status={s.status} />
                </div>
              </div>
            )
          })}

          {data?.presentations.map((p) => {
            const st = STATUS_CONFIG[p.status]
            return (
              <div key={p.id} className="rounded-lg border border-border bg-card px-4 py-3">
                <div className="flex items-center gap-3">
                  <Presentation className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Link href={`/presentations/${p.id}`} className="font-medium text-sm hover:text-primary truncate">
                        {p.title}
                      </Link>
                      <span className={cn('text-xs rounded-full border px-2 py-0.5 shrink-0', st.color)}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Apresentação · {p.client?.name ?? 'Sem cliente'} · {p.author.name} · {new Date(p.updatedAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Link href={`/presentations/${p.id}`} className="shrink-0">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                </div>
                <div className="mt-3 pl-7">
                  <QuickActions type="presentation" id={p.id} status={p.status} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
