'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useSalesSheet,
  useDeleteSalesSheet,
  useUpdateSalesSheetContent,
  useRegenerateSalesSheetField,
  useGenerateMoreVariations,
} from '@/lib/hooks/use-sales-sheets'
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
import { VersionDiff } from '@/components/approvals/version-diff'
import { QAPanel } from '@/components/qa/qa-panel'
import { useQASalesSheet } from '@/lib/hooks/use-qa'
import { useGenerateArt, useGenerateArtBatch } from '@/lib/hooks/use-art'
import { SalesSheetCanvas } from '@/components/canvas/sales-sheet-canvas'
import { CanvasToolbar } from '@/components/canvas/canvas-toolbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useBrandAssets } from '@/lib/hooks/use-brand-assets'
import { Modal, ModalTitle, ModalFooter } from '@/components/ui/modal'
import { VariationSelector } from '@/components/ui/variation-selector'
import {
  ArrowLeft, Sparkles, Palette, Download, FileText, Wand2,
  ImageIcon, Trash2, Eye, ChevronDown, ChevronUp, Image, RefreshCw,
  ShieldCheck, CheckSquare, Layers, GitCompare, Info,
} from 'lucide-react'

type ToolId = 'variations' | 'ai' | 'photos' | 'visual' | 'layout' | 'logo' | 'art' | 'qa' | 'status' | 'export' | 'diff' | 'details'

interface ToolDef {
  id: ToolId
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number
  highlight?: boolean
}

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
  const { mutateAsync: generateArtBatch, isPending: generatingArtBatch, data: artBatchResult } = useGenerateArtBatch()
  const { mutateAsync: deleteMut, isPending: deleting } = useDeleteSalesSheet()
  const { mutateAsync: updateContent } = useUpdateSalesSheetContent()
  const { mutateAsync: regenerateField, isPending: regenerating } = useRegenerateSalesSheetField()
  const { mutateAsync: generateMore, isPending: generatingMore } = useGenerateMoreVariations()
  const router = useRouter()
  const [artPrompt, setArtPrompt] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [activeTool, setActiveTool] = useState<ToolId | null>(null)
  const [artModalUrl, setArtModalUrl] = useState<string | null>(null)

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
  const allProductImages = sheet.product?.images?.map((img: any) => img.url) ?? content?.productImageUrls ?? []
  const productSpecs = sheet.product?.specifications?.slice(0, 5).map((s: any) => ({
    key: s.key, value: s.value, unit: s.unit,
  })) ?? []

  // Designer Engine: support variations
  const hasVariations = Array.isArray(content?.variations) && content.variations.length > 0
  const selectedIdx = content?.selectedVariation ?? 0
  const activeVariation = hasVariations ? content.variations[selectedIdx] : null
  // Active canvas content: merge root + variation (variation wins for copy, visual, layout).
  // This way Direção Visual salva em qualquer caminho (root ou variation) aparece no canvas.
  const activeContent = activeVariation
    ? {
        ...content,
        headline: activeVariation.copy.headline,
        subtitle: activeVariation.copy.subtitle,
        benefits: activeVariation.copy.benefits,
        cta: activeVariation.copy.cta,
        visualSystem: activeVariation.visualSystem ?? content.visualSystem,
        visualDirection: activeVariation.visualDirection ?? content.visualDirection,
      }
    : content
  const activeZones = activeVariation?.layout?.zones ?? zonesConfig

  // Image selection: user can pick subset of product images for canvas composition.
  const availableImages: { url: string; alt?: string; isPrimary?: boolean }[] =
    sheet.product?.images?.map((img: any) => ({ url: img.url, alt: img.altText, isPrimary: img.isPrimary })) ?? []
  const selectedImageUrls: string[] = Array.isArray(content?.selectedImageUrls) && content.selectedImageUrls.length > 0
    ? content.selectedImageUrls
    : allProductImages
  const canvasImageUrls = selectedImageUrls

  /** Save visual-direction edits to both root content and active variation so the
   *  canvas + variation selector re-render immediately. */
  function persistVisualChanges(patch: { visualDirection?: any; visualSystem?: any }) {
    const update: Record<string, any> = { ...patch }
    if (hasVariations && activeVariation) {
      const nextVariations = content.variations.map((v: any, idx: number) =>
        idx === selectedIdx
          ? {
              ...v,
              ...(patch.visualDirection ? { visualDirection: patch.visualDirection } : {}),
              ...(patch.visualSystem ? { visualSystem: patch.visualSystem } : {}),
            }
          : v,
      )
      update.variations = nextVariations
    }
    updateContent({ id, content: update })
  }

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


      <div
        className={`grid grid-cols-1 gap-4 ${
          activeTool ? 'xl:grid-cols-[48px_340px_1fr]' : 'xl:grid-cols-[48px_1fr]'
        }`}
      >
        {/* Tool Rail */}
        <ToolRail activeTool={activeTool} onSelect={(id) => setActiveTool(activeTool === id ? null : id)} />

        {/* Canvas — grows into freed space when no panel open */}
        <div className="space-y-6 xl:order-3">
          {/* Live Preview — minimal chrome, focused on canvas */}
          {activeContent && (activeZones || zonesConfig) && (
            <Card className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-accent" />
                  <span className="text-xs font-medium">Preview</span>
                </div>
                <span className="text-[10px] text-fg-tertiary uppercase tracking-wider">
                  {orientation === 'landscape' ? 'Paisagem' : 'Retrato'} · {canvasImageUrls.length}/{availableImages.length} fotos
                </span>
              </div>
              <div className="p-4 bg-black/[0.02] dark:bg-white/[0.02]">
                <SalesSheetCanvas
                  content={activeContent}
                  zonesConfig={activeZones ?? zonesConfig}
                  productImageUrl={canvasImageUrls[0] ?? productImage}
                  productImageUrls={canvasImageUrls}
                  productSpecs={productSpecs}
                  orientation={orientation as 'landscape' | 'portrait'}
                  editable
                  onContentChange={(field, value) => updateContent({ id, content: { [field]: value } })}
                  backgroundImageUrl={
                    content?.useArtAsBackground
                      ? artResult?.artImageUrl
                        ?? (latestVersion?.artImageKey ? `/api/storage/${latestVersion.artImageKey}` : undefined)
                      : undefined
                  }
                />
              </div>
            </Card>
          )}

        </div>

        {/* Context panel — left of canvas, hidden when no tool active */}
        {activeTool && (
        <div className="space-y-3 xl:order-2">
          {activeTool === 'variations' && hasVariations && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm">Variações</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-2">
                  <VariationSelector
                    variations={content.variations}
                    selectedIndex={selectedIdx}
                    onSelect={(idx) => updateContent({ id, content: { selectedVariation: idx } })}
                    className="!grid-cols-1"
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {activeTool === 'art' && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm">Gerar Lâmina</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {(artResult?.artImageUrl || latestVersion?.artImageKey) && (
                  <button
                    onClick={() =>
                      setArtModalUrl(
                        artResult?.artImageUrl ?? `/api/storage/${latestVersion?.artImageKey}`,
                      )
                    }
                    className="block w-full rounded-lg overflow-hidden bg-black/[0.03] hover:ring-2 hover:ring-accent transition-all"
                    title="Clique para ampliar"
                  >
                    <img
                      src={artResult?.artImageUrl ?? `/api/storage/${latestVersion?.artImageKey}`}
                      alt="Arte gerada"
                      className="max-h-48 w-full object-contain"
                    />
                  </button>
                )}
                <label className="flex items-center gap-1.5 text-xs text-fg-secondary">
                  <input
                    type="checkbox"
                    checked={!!content?.useArtAsBackground}
                    onChange={(e) =>
                      updateContent({ id, content: { useArtAsBackground: e.target.checked } })
                    }
                  />
                  usar como fundo
                </label>
                <input
                  type="text"
                  value={artPrompt}
                  onChange={(e) => setArtPrompt(e.target.value)}
                  placeholder="Ajustes opcionais..."
                  className="w-full rounded border border-border bg-canvas px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={() => generateArt({ salesSheetId: id, prompt: artPrompt || undefined })}
                    loading={generatingArt}
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    1 arte
                  </Button>
                  <Button
                    onClick={() => generateArtBatch({ salesSheetId: id, count: 3, prompt: artPrompt || undefined })}
                    loading={generatingArtBatch}
                    variant="primary"
                    size="sm"
                    className="w-full"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    3 variações
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {activeTool === 'ai' && (
            <AIToolsPanel
              onRegenerate={(field, guidance) => regenerateField({ id, field, guidance })}
              onGenerateMoreVariations={(guidance) => generateMore({ id, guidance })}
              isRegenerating={regenerating}
              isGeneratingMore={generatingMore}
            />
          )}

          {activeTool === 'photos' && availableImages.length > 0 && (
            <ImagePickerPanel
              images={availableImages}
              selectedUrls={selectedImageUrls}
              onChange={(urls) => updateContent({ id, content: { selectedImageUrls: urls } })}
            />
          )}

          {activeTool === 'qa' && <QAPanel onRun={() => runQA(id)} isRunning={runningQA} />}

          {activeTool === 'status' && (
            <StatusActionsPanel
              currentStatus={sheet.status as any}
              history={approvalHistory}
              entityKind="salesSheet"
              onSubmit={() => submitMut({ id })}
              onApprove={() => approveMut({ id })}
              onReject={({ comment, annotations }) => rejectMut({ id, comment, annotations })}
              onArchive={() => archiveMut({ id })}
              isLoading={approvalBusy}
            />
          )}

          {activeTool === 'export' && (
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
          )}

          {activeTool === 'logo' && (
            <LogoSelectorPanel
              currentLogoUrl={content?.logoUrl}
              onSelect={(logoUrl, logoAssetId) => updateContent({ id, content: { logoUrl, logoAssetId } })}
            />
          )}

          {activeTool === 'visual' && (activeContent?.visualDirection || content?.visualDirection) && (
            <VisualDirectionPanel
              visualDirection={activeContent?.visualDirection ?? content.visualDirection}
              visualSystem={activeContent?.visualSystem ?? content.visualSystem}
              onSave={(patch) => persistVisualChanges(patch)}
            />
          )}

          {activeTool === 'layout' && Array.isArray(content?.layoutAlternatives) && content.layoutAlternatives.length > 1 && (
            <LayoutSwapPanel
              layouts={content.layoutAlternatives}
              selectedIndex={content.selectedLayoutIndex ?? 0}
              onSelect={(idx) => {
                const alt = content.layoutAlternatives[idx]
                updateContent({
                  id,
                  content: {
                    selectedLayoutIndex: idx,
                    layout: { ...(content.layout ?? {}), zones: alt.zones },
                  },
                })
              }}
            />
          )}

          {activeTool === 'diff' && sheet.versions && sheet.versions.length > 1 && (
            <VersionDiff versions={sheet.versions as any} kind="salesSheet" />
          )}

          {activeTool === 'details' && (
          <Card>
            <button
              className="flex w-full items-center justify-between p-4 text-left"
              onClick={() => setShowDetails(!showDetails)}
            >
              <CardTitle className="text-sm">Detalhes</CardTitle>
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

                {/* Assets */}
                <div>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">Assets</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between"><span className="text-fg-secondary">QR</span><span className="font-mono truncate max-w-36">{content.qrUrl || '—'}</span></div>
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
          )}
        </div>
        )}
      </div>

      {/* Art fullscreen modal */}
      {artModalUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 animate-fade-in"
          onClick={() => setArtModalUrl(null)}
        >
          <button
            onClick={() => setArtModalUrl(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
            aria-label="Fechar"
          >
            ✕
          </button>
          <img
            src={artModalUrl}
            alt="Arte em tela cheia"
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

// ─── Tool Rail (Photoshop-style icon sidebar) ─────────────────────────────────

function ToolRail({ activeTool, onSelect }: { activeTool: ToolId | null; onSelect: (id: ToolId) => void }) {
  const tools: ToolDef[] = [
    { id: 'art',        label: 'Gerar Lâmina',     icon: Wand2, highlight: true },
    { id: 'variations', label: 'Variações',        icon: Sparkles },
    { id: 'ai',         label: 'Regenerar copy',   icon: RefreshCw },
    { id: 'photos',     label: 'Fotos do produto', icon: Image },
    { id: 'visual',     label: 'Direção Visual',   icon: Palette },
    { id: 'layout',     label: 'Layout',           icon: Layers },
    { id: 'logo',       label: 'Logo',             icon: FileText },
    { id: 'export',     label: 'Exportar',         icon: Download },
    { id: 'diff',       label: 'Diff de versões',  icon: GitCompare },
    { id: 'details',    label: 'Detalhes',         icon: Info },
    { id: 'qa',         label: 'QA / Validação',   icon: ShieldCheck },
    { id: 'status',     label: 'Aprovação',        icon: CheckSquare },
  ]
  return (
    <div className="flex xl:flex-col gap-1 p-1 rounded-standard bg-surface border border-border h-fit sticky top-4">
      {tools.map((t) => {
        const Icon = t.icon
        const active = activeTool === t.id
        const cls = t.highlight
          ? active
            ? 'bg-accent text-white shadow-md ring-2 ring-accent/40'
            : 'bg-accent/15 text-accent hover:bg-accent/25 ring-1 ring-accent/30'
          : active
            ? 'bg-accent text-white shadow-sm'
            : 'text-fg-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.06] hover:text-fg'
        return (
          <div key={t.id} className={t.highlight ? 'mb-1 pb-1 border-b border-border' : ''}>
            <button
              onClick={() => onSelect(t.id)}
              title={t.label}
              className={`flex h-10 w-10 items-center justify-center rounded-micro transition-all ${cls}`}
            >
              <Icon className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}

// ─── Logo Selector Panel ──────────────────────────────────────────────────────

function LogoSelectorPanel({
  currentLogoUrl,
  onSelect,
}: {
  currentLogoUrl?: string
  onSelect: (logoUrl: string, logoAssetId: string) => void
}) {
  const { data: assets, isLoading } = useBrandAssets()
  const [showPicker, setShowPicker] = useState(false)
  const logos = assets?.filter((a) => a.type === 'LOGO') ?? []

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image className="h-4 w-4 text-fg-secondary" />
            <CardTitle className="text-sm">Logo</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowPicker(true)} className="text-xs">
            Alterar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {currentLogoUrl ? (
          <div className="flex items-center justify-center rounded-standard bg-black/[0.03] dark:bg-white/[0.06] p-4 h-16">
            <img src={currentLogoUrl} alt="Logo atual" className="max-h-full max-w-full object-contain" />
          </div>
        ) : (
          <p className="text-xs text-fg-tertiary text-center py-4">Nenhuma logo selecionada</p>
        )}
      </CardContent>

      {showPicker && (
        <Modal open onClose={() => setShowPicker(false)}>
          <ModalTitle>Selecionar Logo</ModalTitle>
          <p className="mt-1 text-caption text-fg-secondary">Escolha a logo que será usada nesta lâmina</p>

          <div className="mt-4 space-y-2 max-h-[50vh] overflow-y-auto">
            {isLoading ? (
              <p className="text-caption text-fg-tertiary py-8 text-center">Carregando...</p>
            ) : logos.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-caption text-fg-tertiary">Nenhuma logo cadastrada</p>
                <p className="text-micro text-fg-tertiary mt-1">Acesse Brand Assets para fazer upload</p>
              </div>
            ) : (
              logos.map((logo) => (
                <button
                  key={logo.id}
                  onClick={() => {
                    onSelect(logo.url, logo.id)
                    setShowPicker(false)
                  }}
                  className={`w-full flex items-center gap-3 rounded-standard p-3 text-left transition-all ${
                    currentLogoUrl === logo.url
                      ? 'bg-accent/[0.08] ring-1 ring-accent/30'
                      : 'bg-surface hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  <div className="h-10 w-16 shrink-0 flex items-center justify-center rounded bg-black/[0.03] dark:bg-white/[0.06] overflow-hidden">
                    <img src={logo.url} alt={logo.name} className="max-h-full max-w-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-medium truncate">{logo.name}</p>
                    <p className="text-micro text-fg-tertiary">{logo.format} · Melhor em fundo {logo.bestOn.toLowerCase()}</p>
                  </div>
                  {currentLogoUrl === logo.url && (
                    <span className="text-micro text-accent font-medium">Atual</span>
                  )}
                </button>
              ))
            )}
          </div>

          <ModalFooter>
            <Button variant="ghost" onClick={() => setShowPicker(false)}>Fechar</Button>
          </ModalFooter>
        </Modal>
      )}
    </Card>
  )
}

// ─── Visual Direction Panel ───────────────────────────────────────────────────

interface StylePreset {
  id: string
  label: string
  colors: string[]        // [dominant, accent, background]
  darkMode: boolean
  suggestedTones: string[]
  defaultBgType: 'solid' | 'gradient-linear' | 'gradient-radial' | 'mesh'
  defaultTexture: 'none' | 'noise' | 'grid' | 'dots'
}

const STYLE_PRESETS: StylePreset[] = [
  {
    id: 'NEON TECH',
    label: 'NEON TECH',
    colors: ['#00f5ff', '#ff00c8', '#0a0a0f'],
    darkMode: true,
    suggestedTones: ['futuro acessível', 'poder silencioso', 'tecnologia pura'],
    defaultBgType: 'gradient-linear',
    defaultTexture: 'grid',
  },
  {
    id: 'CYBERPUNK',
    label: 'CYBERPUNK',
    colors: ['#c850ff', '#0091ff', '#0a0a14'],
    darkMode: true,
    suggestedTones: ['adrenalina controlada', 'urbano noturno', 'rebeldia digital'],
    defaultBgType: 'mesh',
    defaultTexture: 'noise',
  },
  {
    id: 'MINIMAL PREMIUM',
    label: 'MINIMAL PREMIUM',
    colors: ['#0066ff', '#e8e8ec', '#f8f8fa'],
    darkMode: false,
    suggestedTones: ['elegância discreta', 'design essencial', 'sofisticação silenciosa'],
    defaultBgType: 'solid',
    defaultTexture: 'none',
  },
  {
    id: 'GRADIENTE AURORA',
    label: 'GRADIENTE AURORA',
    colors: ['#667eea', '#764ba2', '#0f0f1a'],
    darkMode: true,
    suggestedTones: ['tecnologia humanizada', 'sonho consciente', 'fluidez criativa'],
    defaultBgType: 'gradient-radial',
    defaultTexture: 'none',
  },
  {
    id: 'BOLD INDUSTRIAL',
    label: 'BOLD INDUSTRIAL',
    colors: ['#ffbe0b', '#ff6b00', '#111111'],
    darkMode: true,
    suggestedTones: ['força bruta', 'confiança robusta', 'trabalho sério'],
    defaultBgType: 'solid',
    defaultTexture: 'grid',
  },
  {
    id: 'WARM LIFESTYLE',
    label: 'WARM LIFESTYLE',
    colors: ['#d4a574', '#4a7c59', '#faf5f0'],
    darkMode: false,
    suggestedTones: ['aconchego dourado', 'vida bem vivida', 'simplicidade acolhedora'],
    defaultBgType: 'gradient-linear',
    defaultTexture: 'none',
  },
  {
    id: 'ELECTRIC SPORT',
    label: 'ELECTRIC SPORT',
    colors: ['#c5f82a', '#0055ff', '#0a0a0f'],
    darkMode: true,
    suggestedTones: ['energia explosiva', 'movimento sem pausa', 'performance viva'],
    defaultBgType: 'gradient-linear',
    defaultTexture: 'dots',
  },
]

function stylePresetById(id?: string): StylePreset | null {
  if (!id) return null
  return STYLE_PRESETS.find((s) => s.id === id) ?? null
}

/** CSS background for a mini preview swatch */
function previewBackground(type: string, colors: string[], angle = 135): string {
  const [c0 = '#333', c1 = '#555', c2 = '#222'] = colors
  if (type === 'solid') return c0
  if (type === 'gradient-radial') return `radial-gradient(circle at 30% 30%, ${c0}, ${c1}, ${c2})`
  if (type === 'mesh') {
    return `radial-gradient(at 20% 20%, ${c0} 0%, transparent 50%), radial-gradient(at 80% 30%, ${c1} 0%, transparent 50%), radial-gradient(at 50% 80%, ${c2} 0%, transparent 50%), ${c2}`
  }
  return `linear-gradient(${angle}deg, ${c0}, ${c1}, ${c2})`
}

const TEXTURE_PREVIEW: Record<string, { image: string; size?: string }> = {
  none: { image: '' },
  noise: {
    image:
      'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'80\' height=\'80\'><filter id=\'n\'><feTurbulence baseFrequency=\'0.9\'/></filter><rect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\' opacity=\'0.35\'/></svg>")',
  },
  grid: {
    image:
      'linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)',
    size: '10px 10px',
  },
  dots: {
    image: 'radial-gradient(rgba(255,255,255,0.3) 1px, transparent 1px)',
    size: '8px 8px',
  },
}

function VisualDirectionPanel({
  visualDirection,
  visualSystem,
  onSave,
}: {
  visualDirection: { style?: string; colors?: string[]; emotionalTone?: string; imageAmbiance?: string; background?: string }
  visualSystem?: any
  onSave: (patch: { visualDirection: any; visualSystem?: any }) => void
}) {
  const [editing, setEditing] = useState(false)
  const [style, setStyle] = useState(visualDirection.style ?? '')
  const [colors, setColors] = useState<string[]>(visualDirection.colors ?? [])
  const [tone, setTone] = useState(visualDirection.emotionalTone ?? '')
  const [displayFont, setDisplayFont] = useState(visualSystem?.typography?.displayFont ?? '')
  const [bodyFont, setBodyFont] = useState(visualSystem?.typography?.bodyFont ?? '')
  const [bgType, setBgType] = useState<string>(visualSystem?.background?.type ?? 'gradient-linear')
  const [bgTexture, setBgTexture] = useState<string>(visualSystem?.background?.texture ?? 'none')
  const [bgAngle, setBgAngle] = useState<number>(visualSystem?.background?.angle ?? 135)

  // Re-sync local state when the upstream selection changes (e.g. user switches variation).
  useEffect(() => {
    setStyle(visualDirection.style ?? '')
    setColors(visualDirection.colors ?? [])
    setTone(visualDirection.emotionalTone ?? '')
    setDisplayFont(visualSystem?.typography?.displayFont ?? '')
    setBodyFont(visualSystem?.typography?.bodyFont ?? '')
    setBgType(visualSystem?.background?.type ?? 'gradient-linear')
    setBgTexture(visualSystem?.background?.texture ?? 'none')
    setBgAngle(visualSystem?.background?.angle ?? 135)
  }, [visualDirection, visualSystem])

  function handleSave() {
    const nextVd = {
      ...visualDirection,
      style,
      colors,
      emotionalTone: tone,
    }
    const nextVs = visualSystem
      ? {
          ...visualSystem,
          palette: {
            ...(visualSystem.palette ?? {}),
            background: colors[0] ?? visualSystem.palette?.background,
            backgroundSecondary: colors[1] ?? visualSystem.palette?.backgroundSecondary,
            dominant: colors[2] ?? visualSystem.palette?.dominant,
          },
          typography: {
            ...visualSystem.typography,
            displayFont: displayFont || visualSystem.typography?.displayFont,
            bodyFont: bodyFont || visualSystem.typography?.bodyFont,
          },
          background: {
            ...visualSystem.background,
            type: bgType,
            texture: bgTexture,
            angle: bgAngle,
            colors,
          },
          mood: {
            ...(visualSystem.mood ?? {}),
            style: style || visualSystem.mood?.style,
            emotionalTone: tone || visualSystem.mood?.emotionalTone,
          },
        }
      : undefined
    onSave({ visualDirection: nextVd, visualSystem: nextVs })
    setEditing(false)
  }

  function updateColor(index: number, value: string) {
    const next = [...colors]
    next[index] = value
    setColors(next)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-fg-secondary" />
            <CardTitle className="text-sm">Direção Visual</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEditing(!editing)} className="text-xs">
            {editing ? 'Cancelar' : 'Editar'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {editing ? (
          <div className="space-y-4 animate-fade-in">
            {/* Live preview */}
            <div
              className="rounded-standard overflow-hidden border border-border relative"
              style={{
                height: 84,
                background: previewBackground(bgType, colors, bgAngle),
              }}
            >
              {bgTexture !== 'none' && (
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    backgroundImage: TEXTURE_PREVIEW[bgTexture]?.image,
                    backgroundSize: TEXTURE_PREVIEW[bgTexture]?.size,
                    opacity: 0.6,
                    mixBlendMode: 'overlay',
                  }}
                />
              )}
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-sm drop-shadow" style={{ letterSpacing: '0.02em' }}>
                  {style || 'Preview'}
                </span>
              </div>
            </div>

            {/* Style presets (applies colors + defaults automatically) */}
            <div>
              <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">
                Estética
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {STYLE_PRESETS.map((preset) => {
                  const active = style === preset.id
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setStyle(preset.id)
                        setColors(preset.colors)
                        setBgType(preset.defaultBgType)
                        setBgTexture(preset.defaultTexture)
                        if (!tone || !STYLE_PRESETS.some((p) => p.suggestedTones.includes(tone))) {
                          // keep user tone if custom; otherwise set first suggestion
                        }
                      }}
                      className={`rounded-standard border-2 p-1.5 text-left transition-all ${
                        active ? 'border-accent' : 'border-border hover:border-fg-tertiary'
                      }`}
                    >
                      <div
                        className="h-6 rounded-micro mb-1"
                        style={{
                          background: `linear-gradient(90deg, ${preset.colors.join(', ')})`,
                        }}
                      />
                      <p className="text-[10px] font-semibold truncate">{preset.label}</p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Colors (manual tune) */}
            <div>
              <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">
                Paleta (ajustar)
              </label>
              <div className="flex items-center gap-2">
                {colors.map((c, i) => (
                  <div key={i} className="relative">
                    <input
                      type="color"
                      value={c}
                      onChange={(e) => updateColor(i, e.target.value)}
                      className="absolute inset-0 opacity-0 cursor-pointer w-8 h-8"
                    />
                    <div
                      className="h-8 w-8 rounded-standard border-2 border-border cursor-pointer"
                      style={{ backgroundColor: c }}
                      title={c}
                    />
                  </div>
                ))}
                {colors.length < 4 && (
                  <button
                    onClick={() => setColors([...colors, '#333333'])}
                    className="h-8 w-8 rounded-standard border-2 border-dashed border-border flex items-center justify-center text-fg-tertiary hover:text-fg transition-colors"
                  >
                    +
                  </button>
                )}
                {colors.length > 2 && (
                  <button
                    onClick={() => setColors(colors.slice(0, -1))}
                    className="h-8 w-8 rounded-standard border-2 border-dashed border-border flex items-center justify-center text-fg-tertiary hover:text-danger transition-colors"
                    title="Remover última cor"
                  >
                    −
                  </button>
                )}
              </div>
            </div>

            {/* Tone — chips from selected preset + custom */}
            <div>
              <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">
                Tom Emocional
              </label>
              <div className="flex flex-wrap gap-1.5 mb-1.5">
                {(stylePresetById(style)?.suggestedTones ?? STYLE_PRESETS[0].suggestedTones).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTone(t)}
                    className={`rounded-pill px-2.5 py-1 text-micro transition-all ${
                      tone === t
                        ? 'bg-accent text-white'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-fg-secondary hover:text-fg'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="Ou digite um tom customizado..."
                className="w-full rounded-comfortable border border-border bg-btn-default px-3 py-1.5 text-caption outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            {visualSystem && (
              <>
                {/* Typography */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Display Font</label>
                    <input
                      type="text"
                      value={displayFont}
                      onChange={(e) => setDisplayFont(e.target.value)}
                      placeholder="Montserrat"
                      className="w-full rounded-comfortable border border-border bg-btn-default px-2 py-1 text-micro outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Body Font</label>
                    <input
                      type="text"
                      value={bodyFont}
                      onChange={(e) => setBodyFont(e.target.value)}
                      placeholder="Inter"
                      className="w-full rounded-comfortable border border-border bg-btn-default px-2 py-1 text-micro outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Background type — visual swatches */}
                <div>
                  <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Fundo</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['solid', 'gradient-linear', 'gradient-radial', 'mesh'] as const).map((t) => {
                      const active = bgType === t
                      const labels: Record<string, string> = {
                        solid: 'Sólido',
                        'gradient-linear': 'Linear',
                        'gradient-radial': 'Radial',
                        mesh: 'Mesh',
                      }
                      return (
                        <button
                          key={t}
                          onClick={() => setBgType(t)}
                          className={`rounded-standard border-2 overflow-hidden transition-all ${
                            active ? 'border-accent' : 'border-border hover:border-fg-tertiary'
                          }`}
                        >
                          <div
                            className="h-10 w-full"
                            style={{ background: previewBackground(t, colors, bgAngle) }}
                          />
                          <div className="px-1 py-0.5 text-[9px] font-semibold text-center">
                            {labels[t]}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Texture — visual swatches */}
                <div>
                  <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Textura</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['none', 'noise', 'grid', 'dots'] as const).map((t) => {
                      const active = bgTexture === t
                      const labels: Record<string, string> = {
                        none: 'Limpa',
                        noise: 'Grão',
                        grid: 'Grid',
                        dots: 'Pontos',
                      }
                      return (
                        <button
                          key={t}
                          onClick={() => setBgTexture(t)}
                          className={`rounded-standard border-2 overflow-hidden transition-all ${
                            active ? 'border-accent' : 'border-border hover:border-fg-tertiary'
                          }`}
                        >
                          <div
                            className="h-10 w-full relative"
                            style={{ background: `linear-gradient(135deg, ${colors[0] ?? '#222'}, ${colors[2] ?? '#111'})` }}
                          >
                            {t !== 'none' && (
                              <div
                                className="absolute inset-0"
                                style={{
                                  backgroundImage: TEXTURE_PREVIEW[t].image,
                                  backgroundSize: TEXTURE_PREVIEW[t].size,
                                  opacity: 0.7,
                                  mixBlendMode: 'overlay',
                                }}
                              />
                            )}
                          </div>
                          <div className="px-1 py-0.5 text-[9px] font-semibold text-center">
                            {labels[t]}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {bgType !== 'solid' && bgType !== 'gradient-radial' && bgType !== 'mesh' && (
                  <div>
                    <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">
                      Ângulo gradiente: {bgAngle}°
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      value={bgAngle}
                      onChange={(e) => setBgAngle(Number(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
              </>
            )}

            <Button size="sm" onClick={handleSave} className="w-full">
              Salvar Direção Visual
            </Button>
          </div>
        ) : (
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-fg-tertiary shrink-0">Paleta:</span>
              <div className="flex gap-1">
                {visualDirection.colors?.map((c: string, i: number) => (
                  <div key={i} className="h-5 w-5 rounded border border-border" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
            </div>
            <p><span className="text-fg-tertiary">Estilo:</span> {visualDirection.style || '—'}</p>
            <p><span className="text-fg-tertiary">Tom:</span> {visualDirection.emotionalTone || '—'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ─── AI Tools Panel ───────────────────────────────────────────────────────────

function AIToolsPanel({
  onRegenerate,
  onGenerateMoreVariations,
  isRegenerating,
  isGeneratingMore,
}: {
  onRegenerate: (field: 'headline' | 'subtitle' | 'benefits' | 'cta', guidance?: string) => void
  onGenerateMoreVariations: (guidance?: string) => void
  isRegenerating?: boolean
  isGeneratingMore?: boolean
}) {
  const [open, setOpen] = useState(true)
  const [guidance, setGuidance] = useState('')
  const [busyField, setBusyField] = useState<string | null>(null)

  async function runRegenerate(field: 'headline' | 'subtitle' | 'benefits' | 'cta') {
    setBusyField(field)
    try {
      await onRegenerate(field, guidance.trim() || undefined)
    } finally {
      setBusyField(null)
    }
  }

  async function runMore() {
    setBusyField('more')
    try {
      await onGenerateMoreVariations(guidance.trim() || undefined)
    } finally {
      setBusyField(null)
    }
  }

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-accent" />
          <CardTitle className="text-sm">Ferramentas IA</CardTitle>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-fg-tertiary" /> : <ChevronDown className="h-4 w-4 text-fg-tertiary" />}
      </button>

      {open && (
        <CardContent className="pt-0 space-y-3">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1 block">
              Orientação (opcional)
            </label>
            <textarea
              value={guidance}
              onChange={(e) => setGuidance(e.target.value)}
              rows={2}
              placeholder="ex: mais agressivo, tom premium, foco em economia..."
              className="w-full rounded border border-border bg-background px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-accent resize-none"
            />
            <p className="mt-1 text-[10px] text-fg-tertiary">
              Aplicada a qualquer regeneração abaixo.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {(['headline', 'subtitle', 'benefits', 'cta'] as const).map((field) => (
              <Button
                key={field}
                variant="ghost"
                size="sm"
                onClick={() => runRegenerate(field)}
                loading={isRegenerating && busyField === field}
                className="text-[11px] justify-start"
              >
                <RefreshCw className="h-3 w-3" />
                {field}
              </Button>
            ))}
          </div>

          <Button
            variant="primary"
            size="sm"
            onClick={runMore}
            loading={isGeneratingMore && busyField === 'more'}
            className="w-full"
          >
            <Sparkles className="h-3.5 w-3.5" />
            +3 variações com essa orientação
          </Button>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Image Picker Panel ───────────────────────────────────────────────────────

function ImagePickerPanel({
  images,
  selectedUrls,
  onChange,
}: {
  images: { url: string; alt?: string; isPrimary?: boolean }[]
  selectedUrls: string[]
  onChange: (urls: string[]) => void
}) {
  const [open, setOpen] = useState(true)
  const selectedSet = new Set(selectedUrls)

  function toggle(url: string) {
    const next = new Set(selectedSet)
    if (next.has(url)) next.delete(url)
    else next.add(url)
    // Preserve original order from images prop
    const ordered = images.map((img) => img.url).filter((u) => next.has(u))
    onChange(ordered.length > 0 ? ordered : [images[0]?.url].filter(Boolean) as string[])
  }

  function selectAll() {
    onChange(images.map((img) => img.url))
  }

  function selectOnlyPrimary() {
    const primary = images.find((img) => img.isPrimary) ?? images[0]
    if (primary) onChange([primary.url])
  }

  return (
    <Card>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-2">
          <Image className="h-4 w-4 text-fg-secondary" />
          <CardTitle className="text-sm">Fotos do produto</CardTitle>
          <span className="text-[10px] rounded-full bg-accent/10 px-1.5 py-0.5 text-accent font-semibold">
            {selectedSet.size}/{images.length}
          </span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-fg-tertiary" /> : <ChevronDown className="h-4 w-4 text-fg-tertiary" />}
      </button>

      {open && (
        <CardContent className="pt-0 space-y-2">
          <div className="flex gap-1.5">
            <Button variant="ghost" size="sm" onClick={selectAll} className="text-[10px] flex-1">
              Todas
            </Button>
            <Button variant="ghost" size="sm" onClick={selectOnlyPrimary} className="text-[10px] flex-1">
              Só principal
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-1.5 max-h-80 overflow-y-auto">
            {images.map((img, i) => {
              const selected = selectedSet.has(img.url)
              const order = selected ? selectedUrls.indexOf(img.url) + 1 : null
              return (
                <button
                  key={img.url}
                  onClick={() => toggle(img.url)}
                  className={`relative rounded-micro overflow-hidden border-2 transition-all aspect-square ${
                    selected ? 'border-accent' : 'border-border hover:border-fg-tertiary opacity-60 hover:opacity-100'
                  }`}
                  title={img.alt ?? `Foto ${i + 1}`}
                >
                  <img
                    src={img.url}
                    alt={img.alt ?? `Foto ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                  {selected && (
                    <div className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-white text-[9px] font-bold">
                      {order}
                    </div>
                  )}
                  {img.isPrimary && (
                    <div className="absolute bottom-0 left-0 right-0 bg-accent/80 text-white text-[8px] text-center font-semibold py-0.5">
                      PRINCIPAL
                    </div>
                  )}
                </button>
              )
            })}
          </div>

          {selectedSet.size === 0 && (
            <p className="text-[10px] text-danger text-center py-1">
              Selecione ao menos uma foto
            </p>
          )}
          {selectedSet.size > 0 && (
            <p className="text-[10px] text-fg-tertiary text-center">
              Ordem: números indicam ordem no canvas. Primeira = imagem principal.
            </p>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// ─── Layout Swap Panel ────────────────────────────────────────────────────────

function LayoutSwapPanel({
  layouts,
  selectedIndex,
  onSelect,
}: {
  layouts: Array<{ composition: string }>
  selectedIndex: number
  onSelect: (index: number) => void
}) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-fg-secondary" />
          <CardTitle className="text-sm">Layout</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-1.5">
          {layouts.map((layout, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`rounded-md border-2 p-2 text-center text-[10px] transition-all ${
                i === selectedIndex
                  ? 'border-accent bg-accent/[0.08] text-accent font-medium'
                  : 'border-border hover:border-fg-tertiary'
              }`}
            >
              <p className="truncate">{layout.composition ?? `Layout ${i + 1}`}</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Artifact Row ─────────────────────────────────────────────────────────────

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
