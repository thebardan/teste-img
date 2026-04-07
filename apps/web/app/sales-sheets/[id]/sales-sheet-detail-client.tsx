'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSalesSheet, useDeleteSalesSheet, useUpdateSalesSheetContent, useRegenerateSalesSheetField } from '@/lib/hooks/use-sales-sheets'
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
import { SalesSheetCanvas } from '@/components/canvas/sales-sheet-canvas'
import { CanvasToolbar } from '@/components/canvas/canvas-toolbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft, Sparkles, Palette, Download, FileText, Wand2,
  ImageIcon, Trash2, Eye, ChevronDown, ChevronUp,
} from 'lucide-react'

const statusVariantMap: Record<string, 'default' | 'accent' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'default',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
}

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
  const { mutateAsync: deleteMut, isPending: deleting } = useDeleteSalesSheet()
  const { mutateAsync: updateContent } = useUpdateSalesSheetContent()
  const { mutateAsync: regenerateField, isPending: regenerating } = useRegenerateSalesSheetField()
  const router = useRouter()
  const [artPrompt, setArtPrompt] = useState('')
  const [showDetails, setShowDetails] = useState(false)

  async function handleDelete() {
    if (!confirm('Tem certeza que deseja excluir esta lâmina?')) return
    await deleteMut(id)
    router.push('/sales-sheets')
  }

  async function handleExportPdf() {
    const result = await exportPdf(id)
    refetchArtifacts()
    window.open(result.downloadUrl, '_blank')
  }

  if (isLoading) return <LoadingSkeleton />

  if (!sheet) return (
    <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
      <p className="text-sm text-danger">Lâmina não encontrada.</p>
      <Link href="/sales-sheets" className="mt-2 text-sm text-accent hover:underline">Voltar</Link>
    </div>
  )

  const latestVersion = sheet.versions?.[0]
  const content = latestVersion?.content as any
  const zonesConfig = sheet.template?.zonesConfig as any
  const templateName = sheet.template?.name?.toLowerCase() ?? ''
  const orientation = templateName.includes('vertical') || templateName.includes('a4') ? 'portrait' : 'landscape'
  const productImage = sheet.product?.images?.find((img: any) => img.isPrimary)?.url
    ?? sheet.product?.images?.[0]?.url

  return (
    <div className="p-6 lg:p-8 max-w-7xl animate-slide-up">
      {/* Back link */}
      <Link href="/sales-sheets" className="inline-flex items-center gap-1.5 text-sm text-fg-secondary hover:text-fg mb-6 transition-colors group">
        <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Lâminas
      </Link>

      {/* Title bar */}
      <div className="mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight truncate">{sheet.title}</h1>
            <Badge variant={statusVariantMap[sheet.status] ?? 'secondary'}>
              {sheet.status}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-fg-secondary">
            {sheet.product?.name} &middot; {sheet.template?.name} &middot; {sheet.author?.name}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={handleDelete} loading={deleting} className="shrink-0 text-danger">
          <Trash2 className="h-4 w-4" />
          Excluir
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* Left: Canvas Preview */}
        <div className="space-y-6">
          {/* Live Preview */}
          {content && zonesConfig && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-accent" />
                    <CardTitle className="text-sm">Preview da Lâmina</CardTitle>
                  </div>
                  <span className="text-[10px] text-fg-tertiary uppercase tracking-wider">{orientation === 'landscape' ? 'Paisagem' : 'Retrato'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <CanvasToolbar
                  onRegenerateHeadline={() => regenerateField({ id, field: 'headline' })}
                  onRegenerateBenefits={() => regenerateField({ id, field: 'benefits' })}
                  isRegenerating={regenerating}
                />
                <SalesSheetCanvas
                  content={content}
                  zonesConfig={zonesConfig}
                  productImageUrl={productImage}
                  orientation={orientation as 'landscape' | 'portrait'}
                />
              </CardContent>
            </Card>
          )}

          {/* Art Generation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Wand2 className="h-4 w-4 text-accent" />
                <CardTitle className="text-sm">Arte Final (Gemini)</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {(artResult?.artImageUrl || latestVersion?.artImageKey) && (
                <div className="mb-4 rounded-lg overflow-hidden bg-black/[0.03]">
                  <img
                    src={artResult?.artImageUrl ?? `/api/storage/${latestVersion?.artImageKey}`}
                    alt="Arte gerada"
                    className="max-h-96 w-full object-contain"
                  />
                  <p className="p-2 text-center text-xs text-fg-secondary">
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
                  className="flex-1 rounded-md border border-border bg-canvas px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                <Button
                  onClick={() => generateArt({ salesSheetId: id, prompt: artPrompt || undefined })}
                  loading={generatingArt}
                  variant="primary"
                  size="md"
                >
                  <ImageIcon className="h-4 w-4" />
                  Gerar arte
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Sidebar panels */}
        <div className="space-y-4 stagger-children">
          {/* QA + Status */}
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

          {/* Export */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Download className="h-4 w-4 text-fg-secondary" />
                <CardTitle className="text-sm">Exportar</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={handleExportPdf} loading={exportingPdf} variant="ghost" className="w-full justify-start">
                <FileText className="h-4 w-4 text-danger" />
                Gerar PDF
              </Button>
              {artifacts && artifacts.length > 0 && (
                <div className="mt-3 border-t border-border pt-3 space-y-1.5">
                  <p className="text-xs text-fg-secondary mb-2">Anteriores</p>
                  {artifacts.map((a) => (
                    <SalesSheetArtifactRow key={a.id} artifact={a} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Collapsible Details */}
          <Card>
            <button
              className="flex w-full items-center justify-between p-4 text-left"
              onClick={() => setShowDetails(!showDetails)}
            >
              <span className="text-sm font-medium">Detalhes</span>
              {showDetails ? <ChevronUp className="h-4 w-4 text-fg-secondary" /> : <ChevronDown className="h-4 w-4 text-fg-secondary" />}
            </button>
            {showDetails && content && (
              <CardContent className="pt-0 space-y-5 animate-slide-down">
                {/* Copy */}
                <div>
                  <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
                    <Sparkles className="h-3 w-3" /> Copy
                  </div>
                  <h3 className="text-base font-bold leading-tight">{content.headline}</h3>
                  {content.subtitle && <p className="mt-1 text-xs text-fg-secondary">{content.subtitle}</p>}
                  {content.benefits?.length > 0 && (
                    <ul className="mt-3 space-y-1.5">
                      {content.benefits.map((b: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />{b}
                        </li>
                      ))}
                    </ul>
                  )}
                  {content.cta && (
                    <div className="mt-3 inline-block rounded-md bg-accent/[0.08] px-3 py-1 text-xs font-medium text-accent">
                      {content.cta}
                    </div>
                  )}
                </div>

                {/* Visual Direction */}
                {content.visualDirection && (
                  <div>
                    <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
                      <Palette className="h-3 w-3" /> Direção Visual
                    </div>
                    <div className="space-y-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-fg-secondary">Paleta:</span>
                        <div className="flex gap-1">
                          {content.visualDirection.colors?.map((c: string, i: number) => (
                            <div key={i} className="h-4 w-4 rounded border border-border" style={{ backgroundColor: c }} title={c} />
                          ))}
                        </div>
                      </div>
                      <p><span className="text-fg-secondary">Estilo:</span> {content.visualDirection.style}</p>
                      <p><span className="text-fg-secondary">Tom:</span> {content.visualDirection.emotionalTone}</p>
                    </div>
                  </div>
                )}

                {/* Assets */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">Assets</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-fg-secondary">QR</span><span className="font-mono truncate max-w-36">{content.qrUrl || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-fg-secondary">Logo</span><span className="font-mono truncate max-w-36">{content.logoUrl?.split('/').pop() || '—'}</span></div>
                    <div className="flex justify-between"><span className="text-fg-secondary">Template</span><span>{sheet.template?.name}</span></div>
                  </div>
                </div>

                {/* Versions */}
                {sheet.versions?.length > 0 && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">Versões</p>
                    <div className="space-y-1">
                      {sheet.versions.map((v: any) => (
                        <div key={v.id} className="flex items-center justify-between text-xs border-b border-border/50 py-1">
                          <span>v{v.versionNumber}</span>
                          <span className="text-fg-secondary">{new Date(v.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        </div>
      </div>
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
      className="w-full flex items-center gap-2 text-xs text-fg-secondary hover:text-fg transition-colors group"
    >
      <FileText className="h-3 w-3 shrink-0 text-danger" />
      <span className="flex-1 truncate text-left">{artifact.filename}</span>
      {sizeKb && <span>{sizeKb}kb</span>}
      <Download className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  )
}

function LoadingSkeleton() {
  return (
    <div className="p-6 lg:p-8 max-w-7xl space-y-6 animate-fade-in">
      <Skeleton className="h-4 w-24" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <Skeleton className="h-[450px] rounded-lg" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-24 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
