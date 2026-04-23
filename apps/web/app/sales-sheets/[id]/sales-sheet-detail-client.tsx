'use client'

import { useState } from 'react'
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
  const { mutateAsync: generateArtBatch, isPending: generatingArtBatch, data: artBatchResult } = useGenerateArtBatch()
  const { mutateAsync: deleteMut, isPending: deleting } = useDeleteSalesSheet()
  const { mutateAsync: updateContent } = useUpdateSalesSheetContent()
  const { mutateAsync: regenerateField, isPending: regenerating } = useRegenerateSalesSheetField()
  const { mutateAsync: generateMore, isPending: generatingMore } = useGenerateMoreVariations()
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
  const allProductImages = sheet.product?.images?.map((img: any) => img.url) ?? content?.productImageUrls ?? []
  const productSpecs = sheet.product?.specifications?.slice(0, 5).map((s: any) => ({
    key: s.key, value: s.value, unit: s.unit,
  })) ?? []

  // Designer Engine: support variations
  const hasVariations = Array.isArray(content?.variations) && content.variations.length > 0
  const selectedIdx = content?.selectedVariation ?? 0
  const activeVariation = hasVariations ? content.variations[selectedIdx] : null
  // If we have a selected variation, use its copy for the canvas
  const activeContent = activeVariation
    ? { ...content, headline: activeVariation.copy.headline, subtitle: activeVariation.copy.subtitle, benefits: activeVariation.copy.benefits, cta: activeVariation.copy.cta }
    : content
  // Use variation's layout zones if available, otherwise template zones
  const activeZones = activeVariation?.layout?.zones ?? zonesConfig

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

      {/* Variation Selector — Designer Engine */}
      {hasVariations && (
        <div className="mb-6">
          <h2 className="text-caption font-semibold text-fg-secondary mb-3">Escolha uma variação</h2>
          <VariationSelector
            variations={content.variations}
            selectedIndex={selectedIdx}
            onSelect={(idx) => updateContent({ id, content: { selectedVariation: idx } })}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        {/* Left: Canvas Preview */}
        <div className="space-y-6">
          {/* Live Preview */}
          {activeContent && (activeZones || zonesConfig) && (
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
                  onRegenerate={(field, guidance) => regenerateField({ id, field, guidance })}
                  onGenerateMoreVariations={(guidance) => generateMore({ id, guidance })}
                  isRegenerating={regenerating}
                  isGeneratingMore={generatingMore}
                />
                <SalesSheetCanvas
                  content={activeContent}
                  zonesConfig={activeZones ?? zonesConfig}
                  productImageUrl={productImage}
                  productImageUrls={allProductImages}
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
              </CardContent>
            </Card>
          )}

          {/* Art Generation */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-accent" />
                  <CardTitle className="text-sm">Arte Final (Gemini)</CardTitle>
                </div>
                {(artResult?.artImageUrl || latestVersion?.artImageKey || (artBatchResult?.length ?? 0) > 0) && (
                  <label className="flex items-center gap-1.5 text-xs text-fg-secondary">
                    <input
                      type="checkbox"
                      checked={!!content?.useArtAsBackground}
                      onChange={(e) =>
                        updateContent({ id, content: { useArtAsBackground: e.target.checked } })
                      }
                    />
                    usar como fundo do canvas
                  </label>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {artBatchResult && artBatchResult.length > 1 && (
                <div className="mb-4">
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary">
                    {artBatchResult.length} variações — clique para usar
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {artBatchResult.map((r, i) => (
                      <button
                        key={r.artImageKey}
                        onClick={() =>
                          updateContent({ id, content: { selectedArtKey: r.artImageKey, useArtAsBackground: true } })
                        }
                        className={`rounded overflow-hidden border-2 transition-all ${
                          content?.selectedArtKey === r.artImageKey ? 'border-accent' : 'border-border hover:border-fg-tertiary'
                        }`}
                      >
                        <img src={r.artImageUrl} alt={`Art ${i + 1}`} className="aspect-[4/3] w-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(artResult?.artImageUrl || latestVersion?.artImageKey) && !artBatchResult && (
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
              <div className="space-y-2">
                <input
                  type="text"
                  value={artPrompt}
                  onChange={(e) => setArtPrompt(e.target.value)}
                  placeholder="Ajustes opcionais (ex: fundo branco, produto centralizado...)"
                  className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={() => generateArt({ salesSheetId: id, prompt: artPrompt || undefined })}
                    loading={generatingArt}
                    variant="primary"
                    size="md"
                    className="flex-1"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Gerar 1 arte
                  </Button>
                  <Button
                    onClick={() => generateArtBatch({ salesSheetId: id, count: 3, prompt: artPrompt || undefined })}
                    loading={generatingArtBatch}
                    variant="ghost"
                    size="md"
                  >
                    <Sparkles className="h-4 w-4" />
                    Gerar 3 variações
                  </Button>
                </div>
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
            entityKind="salesSheet"
            onSubmit={() => submitMut({ id })}
            onApprove={() => approveMut({ id })}
            onReject={({ comment, annotations }) => rejectMut({ id, comment, annotations })}
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

          {/* Logo Selector */}
          <LogoSelectorPanel
            currentLogoUrl={content?.logoUrl}
            onSelect={(logoUrl, logoAssetId) => updateContent({ id, content: { logoUrl, logoAssetId } })}
          />

          {/* Visual Direction Editor */}
          {content?.visualDirection && (
            <VisualDirectionPanel
              visualDirection={content.visualDirection}
              visualSystem={content.visualSystem}
              onUpdate={(vd) => updateContent({ id, content: { visualDirection: vd } })}
              onUpdateSystem={(vs) => updateContent({ id, content: { visualSystem: vs } })}
            />
          )}

          {/* Layout Alternatives */}
          {Array.isArray(content?.layoutAlternatives) && content.layoutAlternatives.length > 1 && (
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

          {/* Version Diff */}
          {sheet.versions && sheet.versions.length > 1 && (
            <VersionDiff versions={sheet.versions as any} kind="salesSheet" />
          )}

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
        </div>
      </div>
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

const STYLE_OPTIONS = [
  'NEON TECH', 'CYBERPUNK', 'MINIMAL PREMIUM', 'GRADIENTE AURORA',
  'BOLD INDUSTRIAL', 'WARM LIFESTYLE', 'ELECTRIC SPORT',
]

function VisualDirectionPanel({
  visualDirection,
  visualSystem,
  onUpdate,
  onUpdateSystem,
}: {
  visualDirection: { style?: string; colors?: string[]; emotionalTone?: string; imageAmbiance?: string; background?: string }
  visualSystem?: any
  onUpdate: (vd: typeof visualDirection) => void
  onUpdateSystem?: (vs: any) => void
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

  function handleSave() {
    onUpdate({
      ...visualDirection,
      style,
      colors,
      emotionalTone: tone,
    })
    if (onUpdateSystem && visualSystem) {
      onUpdateSystem({
        ...visualSystem,
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
        },
      })
    }
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
            {/* Style */}
            <div>
              <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Estética</label>
              <div className="flex flex-wrap gap-1.5">
                {STYLE_OPTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`rounded-pill px-2.5 py-1 text-micro transition-all ${
                      style === s
                        ? 'bg-accent text-white'
                        : 'bg-black/[0.04] dark:bg-white/[0.06] text-fg-secondary hover:text-fg'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Colors */}
            <div>
              <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Paleta de Cores</label>
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
              </div>
            </div>

            {/* Tone */}
            <div>
              <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Tom Emocional</label>
              <input
                type="text"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                placeholder="ex: poder silencioso, futuro acessível..."
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

                {/* Background */}
                <div>
                  <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Fundo</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['solid', 'gradient-linear', 'gradient-radial', 'mesh'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setBgType(t)}
                        className={`rounded-pill px-2.5 py-1 text-micro transition-all ${
                          bgType === t
                            ? 'bg-accent text-white'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-fg-secondary hover:text-fg'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Textura</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['none', 'noise', 'grid', 'dots'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setBgTexture(t)}
                        className={`rounded-pill px-2.5 py-1 text-micro transition-all ${
                          bgTexture === t
                            ? 'bg-accent text-white'
                            : 'bg-black/[0.04] dark:bg-white/[0.06] text-fg-secondary hover:text-fg'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {bgType !== 'solid' && (
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
