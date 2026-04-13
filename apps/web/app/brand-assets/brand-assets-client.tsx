'use client'

import { useState, useRef } from 'react'
import { useBrandAssets, useUploadBrandAsset, type BrandAsset, type BackgroundType } from '@/lib/hooks/use-brand-assets'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal, ModalTitle, ModalFooter } from '@/components/ui/modal'
import { Image as ImageIcon, Star, Upload, Plus } from 'lucide-react'

const BG_LABELS: Record<BackgroundType, string> = {
  DARK: 'Fundo Escuro',
  LIGHT: 'Fundo Claro',
  COLORED: 'Fundo Colorido',
  ANY: 'Qualquer Fundo',
}

const BG_PREVIEW: Record<BackgroundType, string> = {
  DARK: 'bg-gray-900',
  LIGHT: 'bg-gray-50',
  COLORED: 'bg-blue-600',
  ANY: 'bg-gradient-to-r from-gray-900 to-gray-100',
}

function AssetCard({ asset }: { asset: BrandAsset }) {
  const [previewBg, setPreviewBg] = useState<BackgroundType>(asset.bestOn)
  const bgs: BackgroundType[] = ['DARK', 'LIGHT', 'COLORED', 'ANY']

  return (
    <div className="rounded-standard bg-surface overflow-hidden transition-all hover:shadow-card">
      {/* Preview area */}
      <div className={cn('flex h-40 items-center justify-center transition-colors p-4', BG_PREVIEW[previewBg])}>
        {asset.url ? (
          <img
            src={asset.url}
            alt={asset.name}
            className="max-h-full max-w-full object-contain"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
              ;(e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
            }}
          />
        ) : null}
        <div className={cn('flex flex-col items-center gap-2', asset.url && 'hidden')}>
          <ImageIcon className="h-10 w-10 opacity-40" />
          <span className="text-micro font-mono opacity-60">{asset.url.split('/').pop()}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-medium text-caption">{asset.name}</p>
            <p className="text-micro text-fg-tertiary">{asset.format} · {asset.type}</p>
          </div>
          <Badge variant="default">{BG_LABELS[asset.bestOn]}</Badge>
        </div>

        {asset.description && (
          <p className="text-micro text-fg-secondary mb-3">{asset.description}</p>
        )}

        {/* Background preview toggle */}
        <div className="mb-3">
          <p className="text-nano uppercase tracking-wider text-fg-tertiary mb-1.5">Preview em:</p>
          <div className="flex gap-1">
            {bgs.map((bg) => (
              <button
                key={bg}
                onClick={() => setPreviewBg(bg)}
                className={cn(
                  'h-5 w-5 rounded border transition-all',
                  bg === 'DARK' && 'bg-gray-900',
                  bg === 'LIGHT' && 'bg-gray-100 border-gray-300',
                  bg === 'COLORED' && 'bg-blue-600',
                  bg === 'ANY' && 'bg-gradient-to-r from-gray-900 to-gray-100',
                  previewBg === bg && 'ring-2 ring-accent ring-offset-1 ring-offset-surface',
                )}
                title={BG_LABELS[bg]}
              />
            ))}
          </div>
        </div>

        {/* Rules */}
        {asset.rules.length > 0 && (
          <div>
            <p className="text-nano uppercase tracking-wider text-fg-tertiary mb-1.5">Regras de uso:</p>
            <div className="space-y-1">
              {asset.rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 text-micro">
                  <div className="flex items-center gap-1 text-warning">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="font-mono">{rule.score}</span>
                  </div>
                  <span className="text-fg-secondary">{rule.notes ?? rule.condition}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function UploadModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [bestOn, setBestOn] = useState<BackgroundType>('ANY')
  const [description, setDescription] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const upload = useUploadBrandAsset()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreview(URL.createObjectURL(f))
    if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
  }

  async function handleUpload() {
    if (!file || !name) return
    await upload.mutateAsync({ file, name, bestOn, description: description || undefined })
    onClose()
  }

  const bgs: BackgroundType[] = ['DARK', 'LIGHT', 'COLORED', 'ANY']

  return (
    <Modal open onClose={onClose}>
      <ModalTitle>Upload de Logo</ModalTitle>
      <div className="mt-5 space-y-4">
        {/* File drop */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full rounded-standard border-2 border-dashed border-border p-6 flex flex-col items-center gap-2 hover:border-accent/50 transition-colors"
        >
          {preview ? (
            <img src={preview} alt="Preview" className="h-20 object-contain" />
          ) : (
            <Upload className="h-8 w-8 text-fg-tertiary" />
          )}
          <span className="text-caption text-fg-secondary">
            {file ? file.name : 'Clique para selecionar arquivo'}
          </span>
          <span className="text-nano text-fg-tertiary">PNG, SVG, JPG — até 20MB</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Name */}
        <div>
          <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Nome</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Logo Multilaser Branca"
            className="w-full rounded-comfortable border border-border bg-btn-default px-3 py-2 text-body outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Best On */}
        <div>
          <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Melhor em</label>
          <div className="grid grid-cols-2 gap-2">
            {bgs.map((bg) => (
              <button
                key={bg}
                onClick={() => setBestOn(bg)}
                className={cn(
                  'rounded-comfortable px-3 py-2 text-caption text-left transition-all',
                  bestOn === bg
                    ? 'bg-accent/[0.08] text-accent font-medium ring-1 ring-accent/30'
                    : 'bg-btn-default text-fg-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
                )}
              >
                {BG_LABELS[bg]}
              </button>
            ))}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-1.5 block">Descrição (opcional)</label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ex: Versão monocromática para fundos escuros"
            className="w-full rounded-comfortable border border-border bg-btn-default px-3 py-2 text-body outline-none focus:ring-2 focus:ring-accent"
          />
        </div>
      </div>

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleUpload} disabled={!file || !name} loading={upload.isPending}>
          <Upload className="h-4 w-4" /> Enviar Logo
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export function BrandAssetsClient() {
  const { data: assets, isLoading, error } = useBrandAssets()
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div className="animate-slide-up">
      {/* Hero section — dark */}
      <section className="section-dark px-6 lg:px-10 py-16">
        <div className="flex items-center justify-between max-w-5xl">
          <div>
            <h1 className="text-hero font-semibold">Brand Assets</h1>
            <p className="mt-2 text-body text-white/60">
              Logos, ícones e assets de marca da Multilaser
            </p>
          </div>
          <Button onClick={() => setShowUpload(true)}>
            <Plus className="h-4 w-4" /> Upload de Logo
          </Button>
        </div>
      </section>

      {/* Content */}
      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-5xl">
          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-standard" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-standard bg-danger/10 p-4 text-caption text-danger">
              Erro ao carregar brand assets.
            </div>
          ) : !assets?.length ? (
            <EmptyState
              icon={ImageIcon}
              title="Nenhum asset cadastrado"
              description="Os brand assets aparecerão aqui quando forem adicionados"
            />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 stagger">
              {assets.map((asset) => (
                <AssetCard key={asset.id} asset={asset} />
              ))}
            </div>
          )}
        </div>
      </section>

      {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
    </div>
  )
}
