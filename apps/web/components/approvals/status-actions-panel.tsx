'use client'

import { useState } from 'react'
import type { ApprovalHistory, ApprovalStatus } from '@/lib/hooks/use-approvals'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, XCircle, Archive, Send, Clock,
  ChevronDown, ChevronUp,
} from 'lucide-react'

const STATUS_CONFIG: Record<ApprovalStatus, { label: string; color: string }> = {
  DRAFT:     { label: 'Rascunho',   color: 'text-muted-foreground border-border' },
  IN_REVIEW: { label: 'Em revisão', color: 'text-warning border-warning/30' },
  APPROVED:  { label: 'Aprovado',   color: 'text-success border-success/30' },
  REJECTED:  { label: 'Rejeitado',  color: 'text-danger border-danger/30' },
  ARCHIVED:  { label: 'Arquivado',  color: 'text-muted-foreground/50 border-border/50' },
}

const ACTION_LABELS: Record<string, string> = {
  CREATED:               'Criado',
  STATUS_CHANGE:         'Status alterado',
  SUBMITTED_FOR_REVIEW:  'Enviado para revisão',
  APPROVED:              'Aprovado',
  REJECTED:              'Rejeitado',
  ARCHIVED:              'Arquivado',
  EXPORTED:              'Exportado',
}

interface StatusActionsPanelProps {
  currentStatus: ApprovalStatus
  history?: ApprovalHistory
  onSubmit: () => Promise<any>
  onApprove: () => Promise<any>
  onReject: (comment: string) => Promise<any>
  onArchive: () => Promise<any>
  isLoading?: boolean
}

export function StatusActionsPanel({
  currentStatus,
  history,
  onSubmit,
  onApprove,
  onReject,
  onArchive,
  isLoading = false,
}: StatusActionsPanelProps) {
  const [showReject, setShowReject] = useState(false)
  const [comment, setComment] = useState('')
  const [showAudit, setShowAudit] = useState(false)

  const st = STATUS_CONFIG[currentStatus]

  async function handleReject() {
    if (!comment.trim()) return
    await onReject(comment)
    setShowReject(false)
    setComment('')
  }

  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-4">
      {/* Current status */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</p>
        <span className={cn('text-xs rounded-full border px-2.5 py-0.5', st.color)}>{st.label}</span>
      </div>

      {/* Actions */}
      {currentStatus !== 'ARCHIVED' && (
        <div className="space-y-2">
          {currentStatus === 'DRAFT' && (
            <button
              onClick={onSubmit}
              disabled={isLoading}
              className="w-full flex items-center gap-2 rounded-md border border-warning/30 px-3 py-2 text-sm text-warning hover:bg-warning/10 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" /> Enviar para revisão
            </button>
          )}

          {currentStatus === 'IN_REVIEW' && !showReject && (
            <>
              <button
                onClick={onApprove}
                disabled={isLoading}
                className="w-full flex items-center gap-2 rounded-md border border-success/30 px-3 py-2 text-sm text-success hover:bg-success/10 disabled:opacity-50 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4" /> Aprovar
              </button>
              <button
                onClick={() => setShowReject(true)}
                disabled={isLoading}
                className="w-full flex items-center gap-2 rounded-md border border-danger/30 px-3 py-2 text-sm text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
              >
                <XCircle className="h-4 w-4" /> Rejeitar
              </button>
            </>
          )}

          {currentStatus === 'REJECTED' && (
            <button
              onClick={onSubmit}
              disabled={isLoading}
              className="w-full flex items-center gap-2 rounded-md border border-warning/30 px-3 py-2 text-sm text-warning hover:bg-warning/10 disabled:opacity-50 transition-colors"
            >
              <Send className="h-4 w-4" /> Reenviar para revisão
            </button>
          )}

          {showReject && (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Motivo da rejeição (obrigatório)..."
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50 resize-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleReject}
                  disabled={!comment.trim() || isLoading}
                  className="flex-1 rounded-md border border-danger/30 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
                >
                  Confirmar rejeição
                </button>
                <button
                  onClick={() => { setShowReject(false); setComment('') }}
                  className="flex-1 rounded-md border border-border py-1.5 text-xs text-muted-foreground hover:bg-muted/20 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          <button
            onClick={onArchive}
            disabled={isLoading}
            className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted/20 disabled:opacity-50 transition-colors"
          >
            <Archive className="h-4 w-4" /> Arquivar
          </button>
        </div>
      )}

      {/* Audit trail */}
      {history && (history.approvals.length > 0 || history.auditLogs.length > 0) && (
        <div className="border-t border-border/50 pt-3">
          <button
            onClick={() => setShowAudit(!showAudit)}
            className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" /> Histórico ({history.auditLogs.length})
            </span>
            {showAudit ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>

          {showAudit && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {history.auditLogs.map((log) => (
                <div key={log.id} className="flex gap-2 text-xs">
                  <div className="mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                  <div className="flex-1 min-w-0">
                    <p className="text-foreground">{ACTION_LABELS[log.action] ?? log.action}</p>
                    {log.metadata?.comment && (
                      <p className="text-muted-foreground italic mt-0.5">&ldquo;{log.metadata.comment}&rdquo;</p>
                    )}
                    <p className="text-muted-foreground/60 mt-0.5">
                      {log.user.name} · {new Date(log.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
