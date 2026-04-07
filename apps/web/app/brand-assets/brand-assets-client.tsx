'use client'

import { useState } from 'react'
import { useBrandAssets, type BrandAsset, type BackgroundType } from '@/lib/hooks/use-brand-assets'
import { cn } from '@/lib/utils'
import { Image as ImageIcon, Star } from 'lucide-react'

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
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* Preview area */}
      <div className={cn('flex h-40 items-center justify-center transition-colors', BG_PREVIEW[previewBg])}>
        <div className="flex flex-col items-center gap-2">
          <ImageIcon className="h-10 w-10 opacity-40" />
          <span className="text-xs font-mono opacity-60">{asset.url.split('/').pop()}</span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="font-medium text-sm">{asset.name}</p>
            <p className="text-xs text-muted-foreground">{asset.format} · {asset.type}</p>
          </div>
          <span className="text-xs rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            {BG_LABELS[asset.bestOn]}
          </span>
        </div>

        {asset.description && (
          <p className="text-xs text-muted-foreground mb-3">{asset.description}</p>
        )}

        {/* Background preview toggle */}
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Preview em:</p>
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
                  previewBg === bg && 'ring-2 ring-primary ring-offset-1 ring-offset-card',
                )}
                title={BG_LABELS[bg]}
              />
            ))}
          </div>
        </div>

        {/* Rules */}
        {asset.rules.length > 0 && (
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Regras de uso:</p>
            <div className="space-y-1">
              {asset.rules.map((rule) => (
                <div key={rule.id} className="flex items-center gap-2 text-xs">
                  <div className="flex items-center gap-1 text-warning">
                    <Star className="h-3 w-3 fill-current" />
                    <span className="font-mono">{rule.score}</span>
                  </div>
                  <span className="text-muted-foreground">{rule.notes ?? rule.condition}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function BrandAssetsClient() {
  const { data: assets, isLoading, error } = useBrandAssets()

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Brand Assets</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gerencie logos, ícones e assets de marca da Multilaser
        </p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-lg border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar brand assets.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assets?.map((asset) => (
            <AssetCard key={asset.id} asset={asset} />
          ))}
        </div>
      )}
    </div>
  )
}
