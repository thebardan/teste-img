'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSalesSheet } from '@/lib/hooks/use-sales-sheets'
import {
  useExportSalesSheetPdf,
  useSalesSheetArtifacts,
  useArtifactDownload,
} from '@/lib/hooks/use-exports'
import {
  useSubmitSalesSheet,
  useApproveSalesSheet,
  useRejectSalesSheet,
  useArchiveSalesSheet,
  useSalesSheetApprovals,
} from '@/lib/hooks/use-approvals'
import { StatusActionsPanel } from '@/components/approvals/status-actions-panel'
import { QAPanel } from '@/components/qa/qa-panel'
import { useQASalesSheet } from '@/lib/hooks/use-qa'
import { useGenerateArt } from '@/lib/hooks/use-art'
import { ArrowLeft, Layers, Sparkles, Palette, Download, FileText, Loader2, Wand2, ImageIcon } from 'lucide-react'

export function SalesSheetDetailClient({ id }: { id: string }) {
  const { data: sheet, isLoading } = useSalesSheet(id)
  const { data: artifacts, refetch: refetchArtifacts } = useSalesSheetArtifacts(id)
  const { mutateAsync: exportPdf, isPending: exportingPdf } = useExportSalesSheetPdf()
  const { data: approvalHistory } = useSalesSheetApprovals(id)
  const { mutateAsync: submitMut,  isPending: submitting  } = useSubmitSalesSheet()
  const { mutateAsync: approveMut, isPending: approving   } = useApproveSalesSheet()
  const { mutateAsync: rejectMut,  isPending: rejecting   } = useRejectSalesSheet()
  const { mutateAsync: archiveMut, isPending: archiving   } = useArchiveSalesSheet()

  const approvalBusy = submitting || approving || rejecting || archiving
  const { mutateAsync: runQA, isPending: runningQA } = useQASalesSheet()
  const { mutateAsync: generateArt, isPending: generatingArt, data: artResult } = useGenerateArt()
  const [artPrompt, setArtPrompt] = useState('')

  async function handleExportPdf() {
    const result = await exportPdf(id)
    refetchArtifacts()
    window.open(result.downloadUrl, '_blank')
  }

  if (isLoading) return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded bg-muted/20" />
      <div className="h-80 rounded-lg bg-muted/20" />
    </div>
  )

  if (!sheet) return <div className="p-8 text-sm text-destructive">Lâmina não encontrada.</div>

  const latestVersion = sheet.versions?.[0]
  const content = latestVersion?.content as any

  return (
    <div className="p-8 max-w-5xl">
      <Link href="/sales-sheets" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Lâminas
      </Link>

      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{sheet.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {sheet.product?.name} · {sheet.template?.name} · {sheet.author?.name}
          </p>
        </div>
      </div>

      {/* QA + Status */}
      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <QAPanel onRun={() => runQA(id)} isRunning={runningQA} />
        <StatusActionsPanel
          currentStatus={sheet.status as any}
          history={approvalHistory}
          onSubmit={() => submitMut({ id })}
          onApprove={() => approveMut({ id })}
          onReject={(comment) => rejectMut({ id, comment })}
          onArchive={() => archiveMut({ id })}
          isLoading={approvalBusy}
        />
      </div>


      {content && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Copy Preview */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5" /> Copy Gerado
            </div>
            <h2 className="text-xl font-bold leading-tight">{content.headline}</h2>
            {content.subtitle && <p className="mt-2 text-sm text-muted-foreground">{content.subtitle}</p>}
            {content.benefits?.length > 0 && (
              <ul className="mt-4 space-y-2">
                {content.benefits.map((b: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-sm">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
            {content.cta && (
              <div className="mt-4 inline-block rounded-md bg-primary/20 px-4 py-1.5 text-sm font-medium text-primary">
                {content.cta}
              </div>
            )}
          </div>

          {/* Visual Direction */}
          {content.visualDirection && (
            <div className="rounded-lg border border-border bg-card p-6">
              <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Palette className="h-3.5 w-3.5" /> Direção Visual
              </div>
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Estilo</p>
                  <p className="font-medium">{content.visualDirection.style}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Paleta</p>
                  <div className="flex gap-2">
                    {content.visualDirection.colors?.map((c: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <div className="h-5 w-5 rounded border border-border" style={{ backgroundColor: c }} />
                        <span className="font-mono text-xs">{c}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Ambiência</p>
                  <p>{content.visualDirection.imageAmbiance}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Tom emocional</p>
                  <p>{content.visualDirection.emotionalTone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Fundo sugerido</p>
                  <span className="rounded-full border border-border px-2 py-0.5 text-xs">
                    {content.visualDirection.background}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* QR + Logo */}
          <div className="rounded-lg border border-border bg-card p-6">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Assets</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted-foreground">QR Destino</span>
                <span className="font-mono text-xs truncate max-w-48">{content.qrUrl}</span>
              </div>
              <div className="flex justify-between border-b border-border/50 py-1.5">
                <span className="text-muted-foreground">Logo</span>
                <span className="font-mono text-xs">{content.logoUrl?.split('/').pop()}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Template</span>
                <span className="text-xs">{sheet.template?.name}</span>
              </div>
            </div>
          </div>

          {/* Versions */}
          {sheet.versions?.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-6">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Versões</p>
              <div className="space-y-2">
                {sheet.versions.map((v: any) => (
                  <div key={v.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1.5">
                    <span>v{v.versionNumber}</span>
                    <span className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Art Generation */}
          <div className="col-span-1 lg:col-span-2 rounded-lg border border-border bg-card p-6">
            <div className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Wand2 className="h-3.5 w-3.5" /> Arte Final (Gemini)
            </div>
            {(artResult?.artImageUrl || latestVersion?.artImageKey) && (
              <div className="mb-4">
                <img
                  src={artResult?.artImageUrl ?? `/api/storage/${latestVersion?.artImageKey}`}
                  alt="Arte gerada"
                  className="max-h-96 rounded-lg object-contain"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Gerado em {latestVersion?.artGeneratedAt
                    ? new Date(latestVersion.artGeneratedAt).toLocaleString('pt-BR')
                    : 'agora'}
                </p>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={artPrompt}
                onChange={(e) => setArtPrompt(e.target.value)}
                placeholder="Ajustes opcionais (ex: fundo branco, produto centralizado...)"
                className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-primary"
              />
              <button
                onClick={() => generateArt({ salesSheetId: id, prompt: artPrompt || undefined })}
                disabled={generatingArt}
                className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
              >
                {generatingArt
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
                  : <><ImageIcon className="h-4 w-4" /> Gerar arte</>
                }
              </button>
            </div>
          </div>

          {/* Export */}
          <div className="rounded-lg border border-border bg-card p-6">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Download className="h-3.5 w-3.5" /> Exportar
            </div>
            <button
              onClick={handleExportPdf}
              disabled={exportingPdf}
              className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/20 disabled:opacity-50 transition-colors"
            >
              {exportingPdf
                ? <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                : <FileText className="h-4 w-4 shrink-0 text-rose-400" />
              }
              <span>Gerar PDF</span>
            </button>

            {artifacts && artifacts.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-3 space-y-1.5">
                <p className="text-xs text-muted-foreground mb-2">Exports anteriores</p>
                {artifacts.map((a) => (
                  <SalesSheetArtifactRow key={a.id} artifact={a} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function SalesSheetArtifactRow({ artifact }: { artifact: import('@/lib/hooks/use-exports').ExportedArtifact }) {
  const { mutateAsync: getDownload, isPending } = useArtifactDownload()

  async function download() {
    const result = await getDownload(artifact.id)
    if (result?.downloadUrl) window.open(result.downloadUrl, '_blank')
  }

  const sizeKb = artifact.sizeBytes ? Math.round(artifact.sizeBytes / 1024) : null

  return (
    <button
      onClick={download}
      disabled={isPending}
      className="w-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors group"
    >
      <FileText className="h-3 w-3 shrink-0 text-rose-400" />
      <span className="flex-1 truncate text-left">{artifact.filename}</span>
      {sizeKb && <span>{sizeKb}kb</span>}
      <Download className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
