'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSalesSheets, useGenerateSalesSheet } from '@/lib/hooks/use-sales-sheets'
import { useProducts } from '@/lib/hooks/use-products'
import { cn } from '@/lib/utils'
import { Plus, Layers, Loader2, ChevronRight } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'text-muted-foreground border-border' },
  IN_REVIEW: { label: 'Em revisão', color: 'text-yellow-400 border-yellow-400/30' },
  APPROVED: { label: 'Aprovado', color: 'text-green-400 border-green-400/30' },
  REJECTED: { label: 'Rejeitado', color: 'text-red-400 border-red-400/30' },
  ARCHIVED: { label: 'Arquivado', color: 'text-muted-foreground/50 border-border/50' },
}

function GenerateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string) => void }) {
  const [productId, setProductId] = useState('')
  const [channel, setChannel] = useState('Varejo')
  const { data: products } = useProducts({ isActive: true } as any)
  const { mutateAsync, isPending, error } = useGenerateSalesSheet()

  async function handleGenerate() {
    if (!productId) return
    const result: any = await mutateAsync({ productId, channel })
    onSuccess(result.salesSheet.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">Gerar Lâmina</h2>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Produto</label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Selecione um produto...</option>
              {products?.data.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Canal</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {['Varejo', 'Distribuidor', 'Varejo Premium', 'E-commerce'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-destructive">{(error as Error).message}</p>
        )}

        <div className="mt-6 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-md border border-border py-2 text-sm hover:bg-muted/20">
            Cancelar
          </button>
          <button
            onClick={handleGenerate}
            disabled={!productId || isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : 'Gerar com IA'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function SalesSheetsClient() {
  const [showModal, setShowModal] = useState(false)
  const { data, isLoading } = useSalesSheets()

  function handleSuccess(id: string) {
    setShowModal(false)
    window.location.href = `/sales-sheets/${id}`
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Lâminas de Vendas</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data?.total ?? 0} lâminas</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nova Lâmina
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg border border-border bg-muted/20 animate-pulse" />
          ))}
        </div>
      ) : !data?.data.length ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
          <Layers className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Nenhuma lâmina ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">Clique em "Nova Lâmina" para gerar com IA</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map((sheet) => {
            const st = STATUS_CONFIG[sheet.status] ?? STATUS_CONFIG.DRAFT
            return (
              <Link
                key={sheet.id}
                href={`/sales-sheets/${sheet.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/50 transition-colors"
              >
                <Layers className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{sheet.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {sheet.product.name} · {sheet.template.name} · v{sheet.versions[0]?.versionNumber ?? 1}
                  </p>
                </div>
                <span className={cn('text-xs rounded-full border px-2.5 py-0.5 shrink-0', st.color)}>
                  {st.label}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </Link>
            )
          })}
        </div>
      )}

      {showModal && <GenerateModal onClose={() => setShowModal(false)} onSuccess={handleSuccess} />}
    </div>
  )
}
