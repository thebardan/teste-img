'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePresentation } from '@/lib/hooks/use-presentations'
import {
  useExportPresentationPptx,
  useExportPresentationPdf,
  usePresentationArtifacts,
  useArtifactDownload,
} from '@/lib/hooks/use-exports'
import {
  useSubmitPresentation,
  useApprovePresentation,
  useRejectPresentation,
  useArchivePresentation,
  usePresentationApprovals,
} from '@/lib/hooks/use-approvals'
import { StatusActionsPanel } from '@/components/approvals/status-actions-panel'
import { ArrowLeft, Presentation, Layers, Building2, Download, FileText, MonitorPlay, Loader2 } from 'lucide-react'

const SLIDE_TYPE_LABELS: Record<string, string> = {
  cover: 'Capa',
  context: 'Contexto',
  products: 'Produtos',
  benefits: 'Benefícios',
  closing: 'Encerramento',
}

export function PresentationDetailClient({ id }: { id: string }) {
  const { data: presentation, isLoading } = usePresentation(id)
  const { data: artifacts, refetch: refetchArtifacts } = usePresentationArtifacts(id)
  const { mutateAsync: exportPptx, isPending: exportingPptx } = useExportPresentationPptx()
  const { mutateAsync: exportPdf,  isPending: exportingPdf  } = useExportPresentationPdf()
  const { data: approvalHistory } = usePresentationApprovals(id)
  const { mutateAsync: submitMut,  isPending: submitting  } = useSubmitPresentation()
  const { mutateAsync: approveMut, isPending: approving   } = useApprovePresentation()
  const { mutateAsync: rejectMut,  isPending: rejecting   } = useRejectPresentation()
  const { mutateAsync: archiveMut, isPending: archiving   } = useArchivePresentation()
  const [lastDownloadUrl, setLastDownloadUrl] = useState<string | null>(null)

  const approvalBusy = submitting || approving || rejecting || archiving

  async function handleExport(type: 'pptx' | 'pdf') {
    const fn = type === 'pptx' ? exportPptx : exportPdf
    const result = await fn(id)
    setLastDownloadUrl(result.downloadUrl)
    refetchArtifacts()
    window.open(result.downloadUrl, '_blank')
  }

  if (isLoading) return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded bg-muted/20" />
      <div className="h-10 w-96 rounded bg-muted/20" />
      <div className="h-80 rounded-lg bg-muted/20" />
    </div>
  )

  if (!presentation) return <div className="p-8 text-sm text-destructive">Apresentação não encontrada.</div>

  const latestVersion = presentation.versions?.[0]
  const slides = latestVersion?.slides ?? []

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href="/presentations"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Apresentações
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{presentation.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {presentation.client?.name ?? 'Sem cliente'}
            {presentation.channel ? ` · ${presentation.channel}` : ''}
            {presentation.focus ? ` · Foco: ${presentation.focus}` : ''}
            {' · '}{presentation.template?.name}
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          {presentation.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Slide Deck */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Layers className="h-3.5 w-3.5" />
            {slides.length} Slides — v{latestVersion?.versionNumber ?? 1}
          </div>

          {slides.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-sm text-muted-foreground">
              Nenhum slide gerado
            </div>
          ) : (
            slides.map((slide, index) => {
              const content = slide.content as any
              const typeLabel = SLIDE_TYPE_LABELS[content?.type] ?? content?.type ?? `Slide ${index + 1}`
              return (
                <div
                  key={slide.id ?? index}
                  className="rounded-lg border border-border bg-card p-5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {index + 1}. {typeLabel}
                    </span>
                  </div>
                  {content?.title && (
                    <h3 className="font-semibold leading-snug">{content.title}</h3>
                  )}
                  {content?.subtitle && (
                    <p className="text-sm text-muted-foreground">{content.subtitle}</p>
                  )}
                  {content?.body?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {(content.body as string[]).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {content?.cta && (
                    <div className="mt-3 inline-block rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                      {content.cta}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status & Approvals */}
          <StatusActionsPanel
            currentStatus={presentation.status as any}
            history={approvalHistory}
            onSubmit={() => submitMut({ id })}
            onApprove={() => approveMut({ id })}
            onReject={(comment) => rejectMut({ id, comment })}
            onArchive={() => archiveMut({ id })}
            isLoading={approvalBusy}
          />

          {/* Client */}
          {presentation.client && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> Cliente
              </div>
              <p className="font-medium text-sm">{presentation.client.name}</p>
              {presentation.client.segment && (
                <p className="text-xs text-muted-foreground mt-0.5">{presentation.client.segment}</p>
              )}
            </div>
          )}

          {/* Versions */}
          {presentation.versions.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Presentation className="h-3.5 w-3.5" /> Versões
              </div>
              <div className="space-y-2">
                {presentation.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1.5 last:border-0">
                    <span>v{v.versionNumber}</span>
                    <span className="text-xs text-muted-foreground">{v.slides.length} slides</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Export */}
          <div className="rounded-lg border border-border bg-card p-5">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Download className="h-3.5 w-3.5" /> Exportar
            </div>
            <div className="space-y-2">
              <button
                onClick={() => handleExport('pptx')}
                disabled={exportingPptx}
                className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/20 disabled:opacity-50 transition-colors"
              >
                {exportingPptx ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <MonitorPlay className="h-4 w-4 shrink-0 text-violet-400" />}
                <span>Gerar PPTX</span>
              </button>
              <button
                onClick={() => handleExport('pdf')}
                disabled={exportingPdf}
                className="w-full flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/20 disabled:opacity-50 transition-colors"
              >
                {exportingPdf ? <Loader2 className="h-4 w-4 animate-spin shrink-0" /> : <FileText className="h-4 w-4 shrink-0 text-rose-400" />}
                <span>Gerar PDF</span>
              </button>
            </div>

            {/* Artifacts history */}
            {artifacts && artifacts.length > 0 && (
              <div className="mt-4 border-t border-border/50 pt-3 space-y-1.5">
                <p className="text-xs text-muted-foreground mb-2">Exports anteriores</p>
                {artifacts.map((a) => (
                  <ArtifactRow key={a.id} artifact={a} />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}

function ArtifactRow({ artifact }: { artifact: import('@/lib/hooks/use-exports').ExportedArtifact }) {
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
      {artifact.type === 'PPTX'
        ? <MonitorPlay className="h-3 w-3 shrink-0 text-violet-400" />
        : <FileText className="h-3 w-3 shrink-0 text-rose-400" />
      }
      <span className="flex-1 truncate text-left">{artifact.filename}</span>
      {sizeKb && <span>{sizeKb}kb</span>}
      <Download className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}
