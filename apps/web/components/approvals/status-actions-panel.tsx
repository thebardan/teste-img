'use client'

import { useState } from 'react'
import type { ApprovalHistory, ApprovalStatus, Annotation } from '@/lib/hooks/use-approvals'
import { cn } from '@/lib/utils'
import {
  CheckCircle2, XCircle, Archive, Send, Clock,
  ChevronDown, ChevronUp, Plus, Trash2,
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

export interface RejectPayload {
  comment?: string
  annotations?: Annotation[]
}

interface StatusActionsPanelProps {
  currentStatus: ApprovalStatus
  history?: ApprovalHistory
  entityKind?: 'salesSheet' | 'presentation'
  fieldOptions?: { value: string; label: string }[]
  slideCount?: number
  onSubmit: () => Promise<any>
  onApprove: () => Promise<any>
  onReject: (payload: RejectPayload) => Promise<any>
  onArchive: () => Promise<any>
  isLoading?: boolean
}

const DEFAULT_SHEET_FIELDS = [
  { value: 'headline', label: 'Headline' },
  { value: 'subtitle', label: 'Subtítulo' },
  { value: 'benefits', label: 'Benefícios' },
  { value: 'cta', label: 'CTA' },
  { value: 'logoUrl', label: 'Logo' },
  { value: 'qrUrl', label: 'QR Code' },
  { value: 'visualDirection', label: 'Direção Visual' },
]

const DEFAULT_PRESENTATION_FIELDS = [
  { value: 'title', label: 'Título' },
  { value: 'subtitle', label: 'Subtítulo' },
  { value: 'body', label: 'Corpo / tópicos' },
  { value: 'cta', label: 'CTA' },
  { value: 'logoUrl', label: 'Logo' },
  { value: 'visualDirection', label: 'Direção Visual' },
]

export function StatusActionsPanel({
  currentStatus,
  history,
  entityKind = 'salesSheet',
  fieldOptions,
  slideCount,
  onSubmit,
  onApprove,
  onReject,
  onArchive,
  isLoading = false,
}: StatusActionsPanelProps) {
  const [showReject, setShowReject] = useState(false)
  const [comment, setComment] = useState('')
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [showAudit, setShowAudit] = useState(false)

  const st = STATUS_CONFIG[currentStatus]
  const fields = fieldOptions
    ?? (entityKind === 'presentation' ? DEFAULT_PRESENTATION_FIELDS : DEFAULT_SHEET_FIELDS)

  async function handleReject() {
    const hasComment = comment.trim().length > 0
    const hasAnn = annotations.some((a) => a.comment.trim().length > 0)
    if (!hasComment && !hasAnn) return
    await onReject({
      comment: hasComment ? comment.trim() : undefined,
      annotations: hasAnn ? annotations.filter((a) => a.comment.trim()) : undefined,
    })
    setShowReject(false)
    setComment('')
    setAnnotations([])
  }

  function addAnnotation() {
    setAnnotations([...annotations, { targetField: fields[0]?.value, comment: '' }])
  }

  function updateAnnotation(i: number, patch: Partial<Annotation>) {
    setAnnotations(annotations.map((a, idx) => (idx === i ? { ...a, ...patch } : a)))
  }

  function removeAnnotation(i: number) {
    setAnnotations(annotations.filter((_, idx) => idx !== i))
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
            <div className="space-y-3 rounded-md border border-danger/20 bg-danger/[0.03] p-3">
              <div>
                <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1.5 block">
                  Comentário geral (opcional se houver anotações)
                </label>
                <textarea
                  autoFocus
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Ex: revisar tom de voz geral, ajustar posicionamento..."
                  rows={2}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50 resize-none"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
                    Anotações por campo ({annotations.length})
                  </label>
                  <button
                    type="button"
                    onClick={addAnnotation}
                    className="flex items-center gap-1 text-[10px] text-accent hover:underline"
                  >
                    <Plus className="h-3 w-3" /> Adicionar
                  </button>
                </div>

                {annotations.length > 0 && (
                  <div className="space-y-2">
                    {annotations.map((ann, i) => (
                      <div key={i} className="rounded border border-border/50 bg-background p-2 space-y-1.5">
                        <div className="flex gap-1.5">
                          <select
                            value={ann.targetField ?? ''}
                            onChange={(e) => updateAnnotation(i, { targetField: e.target.value })}
                            className="flex-1 rounded border border-border bg-background px-2 py-1 text-[11px] outline-none"
                          >
                            {fields.map((f) => (
                              <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                          </select>
                          {entityKind === 'presentation' && slideCount && slideCount > 0 && (
                            <select
                              value={ann.targetSlideOrder ?? ''}
                              onChange={(e) => updateAnnotation(i, {
                                targetSlideOrder: e.target.value === '' ? undefined : Number(e.target.value),
                              })}
                              className="w-20 rounded border border-border bg-background px-2 py-1 text-[11px] outline-none"
                            >
                              <option value="">Todos</option>
                              {Array.from({ length: slideCount }).map((_, idx) => (
                                <option key={idx} value={idx}>Slide {idx + 1}</option>
                              ))}
                            </select>
                          )}
                          <button
                            type="button"
                            onClick={() => removeAnnotation(i)}
                            className="rounded p-1 text-fg-tertiary hover:text-danger"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                        <textarea
                          value={ann.comment}
                          onChange={(e) => updateAnnotation(i, { comment: e.target.value })}
                          placeholder="O que precisa mudar aqui?"
                          rows={2}
                          className="w-full rounded border border-border bg-background px-2 py-1 text-[11px] outline-none resize-none"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleReject}
                  disabled={
                    isLoading ||
                    (!comment.trim() && !annotations.some((a) => a.comment.trim()))
                  }
                  className="flex-1 rounded-md border border-danger/30 py-1.5 text-xs text-danger hover:bg-danger/10 disabled:opacity-50 transition-colors"
                >
                  Confirmar rejeição
                </button>
                <button
                  onClick={() => {
                    setShowReject(false)
                    setComment('')
                    setAnnotations([])
                  }}
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

      {/* Approval annotations from latest rejection */}
      {history && history.approvals.length > 0 && (() => {
        const latestRejection = history.approvals.find((a) => a.status === 'REJECTED')
        const anns = Array.isArray(latestRejection?.annotations) ? latestRejection!.annotations : []
        if (!latestRejection || (!latestRejection.comment && anns.length === 0)) return null
        return (
          <div className="rounded-md border border-danger/30 bg-danger/[0.04] p-3 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-danger">
              Última revisão pediu ajustes
            </p>
            {latestRejection.comment && (
              <p className="text-xs italic text-fg-secondary">&ldquo;{latestRejection.comment}&rdquo;</p>
            )}
            {anns.length > 0 && (
              <ul className="space-y-1.5 text-xs">
                {anns.map((a, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="shrink-0 rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-medium text-danger">
                      {a.targetField ?? 'geral'}
                      {typeof a.targetSlideOrder === 'number' ? ` · S${a.targetSlideOrder + 1}` : ''}
                    </span>
                    <span className="text-fg-secondary">{a.comment}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="text-[10px] text-fg-tertiary">
              por {latestRejection.approver.name} · {new Date(latestRejection.createdAt).toLocaleString('pt-BR')}
            </p>
          </div>
        )
      })()}

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
