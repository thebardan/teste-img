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
import { QAPanel } from '@/components/qa/qa-panel'
import { useQAPresentation } from '@/lib/hooks/use-qa'
import { PresentationSlideCanvas } from '@/components/canvas/presentation-slide-canvas'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  ArrowLeft, Layers, Building2, Download, FileText,
  MonitorPlay, ChevronLeft, ChevronRight, Presentation,
} from 'lucide-react'

const SLIDE_TYPE_LABELS: Record<string, string> = {
  cover: 'Capa',
  context: 'Contexto',
  products: 'Produtos',
  benefits: 'Beneficios',
  closing: 'Encerramento',
}

const statusVariantMap: Record<string, 'default' | 'accent' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'default',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
}

export function PresentationDetailClient({ id }: { id: string }) {
  const { data: presentation, isLoading } = usePresentation(id)
  const { data: artifacts, refetch: refetchArtifacts } = usePresentationArtifacts(id)
  const { mutateAsync: exportPptx, isPending: exportingPptx } = useExportPresentationPptx()
  const { mutateAsync: exportPdf, isPending: exportingPdf } = useExportPresentationPdf()
  const { data: approvalHistory } = usePresentationApprovals(id)
  const { mutateAsync: submitMut, isPending: submitting } = useSubmitPresentation()
  const { mutateAsync: approveMut, isPending: approving } = useApprovePresentation()
  const { mutateAsync: rejectMut, isPending: rejecting } = useRejectPresentation()
  const { mutateAsync: archiveMut, isPending: archiving } = useArchivePresentation()
  const approvalBusy = submitting || approving || rejecting || archiving
  const { mutateAsync: runQA, isPending: runningQA } = useQAPresentation()
  const [activeSlide, setActiveSlide] = useState(0)

  async function handleExport(type: 'pptx' | 'pdf') {
    const fn = type === 'pptx' ? exportPptx : exportPdf
    const result = await fn(id)
    refetchArtifacts()
    window.open(result.downloadUrl, '_blank')
  }

  if (isLoading) return <LoadingSkeleton />

  if (!presentation) return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <p className="text-sm text-danger">Apresentação não encontrada.</p>
      <Link href="/presentations" className="mt-2 text-sm text-primary hover:underline">Voltar</Link>
    </div>
  )

  const latestVersion = presentation.versions?.[0]
  const slides = latestVersion?.slides ?? []
  const currentSlide = slides[activeSlide]
  const currentContent = currentSlide?.content as any
  const zonesConfig = presentation.template?.zonesConfig as any

  return (
    <div className="p-6 lg:p-8 max-w-7xl animate-slide-up">
      {/* Back */}
      <Link href="/presentations" className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg mb-6 transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Apresentações
      </Link>

      {/* Title */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">{presentation.title}</h1>
            <Badge variant={statusVariantMap[presentation.status] ?? 'default'}>
              {presentation.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            {presentation.client?.name ?? 'Sem cliente'}
            {presentation.channel ? ` · ${presentation.channel}` : ''}
            {presentation.focus ? ` · Foco: ${presentation.focus}` : ''}
            {' · '}{presentation.template?.name}
          </p>
        </div>
        <span className="text-xs text-fg-tertiary whitespace-nowrap">
          v{latestVersion?.versionNumber ?? 1} · {slides.length} slides
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        {/* Left: Slides */}
        <div className="space-y-4">
          {/* Active slide canvas */}
          {slides.length > 0 && currentContent ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm">
                      Slide {activeSlide + 1}/{slides.length} — {SLIDE_TYPE_LABELS[currentContent?.type] ?? currentContent?.type}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveSlide(Math.max(0, activeSlide - 1))}
                      disabled={activeSlide === 0}
                      className="h-7 w-7"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setActiveSlide(Math.min(slides.length - 1, activeSlide + 1))}
                      disabled={activeSlide === slides.length - 1}
                      className="h-7 w-7"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <PresentationSlideCanvas
                  content={currentContent}
                  zonesConfig={zonesConfig}
                />
              </CardContent>
            </Card>
          ) : (
            <Card className="p-8">
              <EmptyState
                icon={Presentation}
                title="Nenhum slide gerado"
                description="Esta apresentação ainda não tem slides"
              />
            </Card>
          )}

          {/* Slide thumbnails */}
          {slides.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {slides.map((slide, i) => {
                const slideContent = slide.content as any
                return (
                  <button
                    key={slide.id ?? i}
                    onClick={() => setActiveSlide(i)}
                    className={`shrink-0 w-36 rounded-lg border-2 overflow-hidden transition-all ${
                      i === activeSlide
                        ? 'border-primary shadow-card'
                        : 'border-border hover:border-fg-tertiary opacity-70 hover:opacity-100'
                    }`}
                  >
                    <PresentationSlideCanvas
                      content={slideContent}
                      zonesConfig={zonesConfig}
                      compact
                    />
                    <div className="bg-canvas px-2 py-1 border-t border-border">
                      <p className="text-[9px] font-medium text-fg-secondary truncate">
                        {i + 1}. {SLIDE_TYPE_LABELS[slideContent?.type] ?? slideContent?.type}
                      </p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {/* Slide content details */}
          {currentContent && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Conteúdo do Slide</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentContent.title && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1">Título</p>
                    <p className="text-sm font-medium">{currentContent.title}</p>
                  </div>
                )}
                {currentContent.subtitle && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1">Subtítulo</p>
                    <p className="text-sm text-fg-secondary">{currentContent.subtitle}</p>
                  </div>
                )}
                {currentContent.body?.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1">Tópicos</p>
                    <ul className="space-y-1">
                      {(currentContent.body as string[]).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {currentContent.cta && (
                  <div className="inline-block rounded-md bg-accent/[0.08] px-3 py-1 text-xs font-medium text-primary">
                    {currentContent.cta}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Sidebar */}
        <div className="space-y-4 stagger">
          <QAPanel onRun={() => runQA(id)} isRunning={runningQA} />

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
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-fg-secondary" />
                  <CardTitle className="text-sm">Cliente</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-sm">{presentation.client.name}</p>
                {presentation.client.segment && (
                  <p className="text-xs text-fg-secondary mt-0.5">{presentation.client.segment}</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Export */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-fg-secondary" />
                <CardTitle className="text-sm">Exportar</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button onClick={() => handleExport('pptx')} loading={exportingPptx} variant="ghost" className="w-full justify-start">
                <MonitorPlay className="h-4 w-4 text-accent" />
                Gerar PPTX
              </Button>
              <Button onClick={() => handleExport('pdf')} loading={exportingPdf} variant="ghost" className="w-full justify-start">
                <FileText className="h-4 w-4 text-danger" />
                Gerar PDF
              </Button>

              {artifacts && artifacts.length > 0 && (
                <div className="mt-3 border-t border-border pt-3 space-y-1.5">
                  <p className="text-xs text-fg-secondary mb-2">Anteriores</p>
                  {artifacts.map((a) => (
                    <ArtifactRow key={a.id} artifact={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Versions */}
          {presentation.versions.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Presentation className="h-4 w-4 text-fg-secondary" />
                  <CardTitle className="text-sm">Versões</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {presentation.versions.map((v) => (
                    <div key={v.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1.5 last:border-0">
                      <span className="font-medium">v{v.versionNumber}</span>
                      <span className="text-xs text-fg-secondary">{v.slides.length} slides</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
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
      className="w-full flex items-center gap-2 text-xs text-fg-secondary hover:text-fg transition-colors group"
    >
      {artifact.type === 'PPTX'
        ? <MonitorPlay className="h-3 w-3 shrink-0 text-accent" />
        : <FileText className="h-3 w-3 shrink-0 text-danger" />
      }
      <span className="flex-1 truncate text-left">{artifact.filename}</span>
      {sizeKb && <span>{sizeKb}kb</span>}
      <Download className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl space-y-6 animate-fade-in">
      <Skeleton className="h-4 w-28" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <Skeleton className="h-[380px] rounded-lg" />
          <div className="flex gap-2">
            <Skeleton className="h-24 w-36 rounded-lg" />
            <Skeleton className="h-24 w-36 rounded-lg" />
            <Skeleton className="h-24 w-36 rounded-lg" />
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
