'use client'

import { useState } from 'react'
import {
  useDriveSyncStatus,
  useUnmatchedFolders,
  useTriggerSync,
  useLinkFolder,
  useRejectFolder,
} from '@/lib/hooks/use-drive-sync'
import { useProducts } from '@/lib/hooks/use-products'
import { RefreshCw, Loader2, Link2, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DriveSyncClient() {
  const { data: status } = useDriveSyncStatus()
  const { data: unmatched, isLoading: unmatchedLoading } = useUnmatchedFolders()
  const { mutateAsync: triggerSync, isPending: syncing } = useTriggerSync()
  const { data: products } = useProducts()

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Google Drive Sync</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sincronize imagens de produtos do Google Drive
          </p>
        </div>
        <button
          onClick={() => triggerSync()}
          disabled={syncing || status?.isRunning}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {syncing || status?.isRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sincronizando...</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> Sincronizar agora</>
          )}
        </button>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Pastas" value={status.stats.totalFolders} />
          <StatCard label="Vinculadas" value={status.stats.matchedFolders} color="text-green-400" />
          <StatCard label="Pendentes" value={status.stats.unmatchedFolders} color="text-yellow-400" />
          <StatCard label="Imagens sincronizadas" value={status.stats.syncedImages} color="text-blue-400" />
        </div>
      )}

      {/* Last sync info */}
      {status && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Último sync:</span>
            <span>{status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}</span>
            {status.lastError && (
              <span className="ml-auto text-destructive">Erro: {status.lastError}</span>
            )}
          </div>
        </div>
      )}

      {/* Unmatched Folders Table */}
      <div>
        <h2 className="mb-3 text-lg font-semibold">Pastas não vinculadas</h2>
        {unmatchedLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : !unmatched?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma pasta pendente de vinculação.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pasta no Drive</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sugestão</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Imagens</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {unmatched.map((folder) => (
                  <UnmatchedRow
                    key={folder.id}
                    folder={folder}
                    products={products?.data ?? []}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('mt-1 text-2xl font-bold', color)}>{value}</p>
    </div>
  )
}

function UnmatchedRow({
  folder,
  products,
}: {
  folder: {
    id: string
    name: string
    matchScore: number | null
    suggestedProduct: { id: string; name: string; sku: string } | null
    imageCount: number
  }
  products: { id: string; name: string; sku: string }[]
}) {
  const [selectedProductId, setSelectedProductId] = useState(folder.suggestedProduct?.id ?? '')
  const { mutateAsync: linkFolder, isPending: linking } = useLinkFolder()
  const { mutateAsync: rejectFolder, isPending: rejecting } = useRejectFolder()

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{folder.name}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {folder.suggestedProduct ? (
          <span>
            {folder.suggestedProduct.name}{' '}
            <span className="text-xs">({folder.suggestedProduct.sku})</span>
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3">
        {folder.matchScore !== null ? (
          <span className={cn(
            'rounded px-1.5 py-0.5 font-mono text-xs',
            folder.matchScore >= 0.75 ? 'bg-green-400/10 text-green-400' :
            folder.matchScore >= 0.5 ? 'bg-yellow-400/10 text-yellow-400' :
            'bg-red-400/10 text-red-400',
          )}>
            {(folder.matchScore * 100).toFixed(0)}%
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{folder.imageCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-48 rounded border border-border bg-background px-2 py-1.5 text-xs outline-none"
          >
            <option value="">Selecionar produto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
          <button
            onClick={() => selectedProductId && linkFolder({ folderId: folder.id, productId: selectedProductId })}
            disabled={!selectedProductId || linking}
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {linking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
          </button>
          <button
            onClick={() => rejectFolder(folder.id)}
            disabled={rejecting}
            className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            {rejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
          </button>
        </div>
      </td>
    </tr>
  )
}
