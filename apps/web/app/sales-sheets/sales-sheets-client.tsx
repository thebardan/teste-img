'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useSalesSheets, useGenerateSalesSheet } from '@/lib/hooks/use-sales-sheets'
import { useProducts } from '@/lib/hooks/use-products'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal, ModalTitle, ModalFooter } from '@/components/ui/modal'
import {
  Plus, Layers, ChevronRight, Search, Package, Loader2,
} from 'lucide-react'

const STATUS_BADGE: Record<string, 'default' | 'accent' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'default',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
}

function GenerateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string) => void }) {
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; name: string; sku: string; primaryImageUrl: string | null } | null>(null)
  const [channel, setChannel] = useState('Varejo')
  const [page, setPage] = useState(1)
  const { data: products, isFetching } = useProducts({ search, page })
  const { mutateAsync, isPending, error } = useGenerateSalesSheet()

  async function handleGenerate() {
    if (!selectedProduct) return
    const result: any = await mutateAsync({ productId: selectedProduct.id, channel })
    onSuccess(result.salesSheet.id)
  }

  const totalPages = products ? Math.ceil(products.total / products.pageSize) : 0

  return (
    <Modal open onClose={onClose}>
      <ModalTitle>Gerar Lâmina</ModalTitle>

      <div className="mt-5 space-y-5">
        <div>
          <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-2 block">Produto</label>
          {selectedProduct ? (
            <div className="flex items-center gap-3 rounded-standard bg-accent/[0.06] px-3 py-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-standard bg-surface overflow-hidden">
                {selectedProduct.primaryImageUrl
                  ? <img src={selectedProduct.primaryImageUrl} alt="" className="h-full w-full object-contain" />
                  : <Package className="h-4 w-4 text-fg-tertiary" />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-caption font-medium truncate">{selectedProduct.name}</p>
                <p className="text-micro text-fg-tertiary font-mono">{selectedProduct.sku}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProduct(null)}>Trocar</Button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-tertiary" />
                <input
                  type="text"
                  placeholder="Buscar por nome ou SKU..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                  autoFocus
                  className="w-full rounded-comfortable border-[3px] border-black/[0.04] bg-btn-default pl-9 pr-4 py-2 text-body outline-none focus:ring-2 focus:ring-accent"
                />
                {isFetching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-fg-tertiary" />}
              </div>
              <div className="mt-2 max-h-52 overflow-y-auto rounded-standard bg-btn-default">
                {!products?.data.length ? (
                  <p className="px-3 py-6 text-center text-caption text-fg-tertiary">{isFetching ? 'Buscando...' : 'Nenhum produto'}</p>
                ) : products.data.map((p) => (
                  <button key={p.id} onClick={() => setSelectedProduct(p)}
                    className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-black/[0.04] transition-colors">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-micro bg-surface overflow-hidden">
                      {p.primaryImageUrl ? <img src={p.primaryImageUrl} alt="" className="h-full w-full object-contain" /> : <Package className="h-3.5 w-3.5 text-fg-tertiary" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-caption truncate">{p.name}</p>
                      <p className="text-micro text-fg-tertiary font-mono">{p.sku}</p>
                    </div>
                  </button>
                ))}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-border">
                    <span className="text-micro text-fg-tertiary">{products!.total} produtos</span>
                    <div className="flex gap-1">
                      <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-2 py-0.5 text-micro rounded-micro hover:bg-black/[0.04] disabled:opacity-30">&lsaquo;</button>
                      <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-2 py-0.5 text-micro rounded-micro hover:bg-black/[0.04] disabled:opacity-30">&rsaquo;</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div>
          <label className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-2 block">Canal</label>
          <div className="grid grid-cols-2 gap-2">
            {['Varejo', 'Distribuidor', 'Varejo Premium', 'E-commerce'].map((c) => (
              <button key={c} onClick={() => setChannel(c)}
                className={cn('rounded-standard px-3 py-2.5 text-caption text-left transition-all',
                  channel === c ? 'bg-accent/[0.08] text-accent font-medium ring-1 ring-accent/30' : 'bg-btn-default text-fg-secondary hover:bg-black/[0.04]'
                )}>{c}</button>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="mt-3 text-micro text-danger">{(error as Error).message}</p>}

      <ModalFooter>
        <Button variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button onClick={handleGenerate} disabled={!selectedProduct} loading={isPending}>Gerar com IA</Button>
      </ModalFooter>
    </Modal>
  )
}

export function SalesSheetsClient() {
  const [showModal, setShowModal] = useState(false)
  const { data, isLoading } = useSalesSheets()

  return (
    <div className="animate-slide-up">
      <section className="section-dark px-6 lg:px-10 py-14">
        <div className="flex items-end justify-between max-w-5xl">
          <div>
            <h1 className="text-hero font-semibold">Lâminas</h1>
            <p className="mt-1 text-body text-white/50">{data?.total ?? 0} lâminas de vendas</p>
          </div>
          <Button onClick={() => setShowModal(true)}>
            <Plus className="h-4 w-4" /> Nova Lâmina
          </Button>
        </div>
      </section>

      <section className="px-6 lg:px-10 py-8">
        <div className="max-w-5xl">
          {isLoading ? (
            <div className="space-y-2 stagger">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : !data?.data.length ? (
            <EmptyState icon={Layers} title="Nenhuma lâmina" description="Clique em Nova Lâmina para gerar com IA"
              action={<Button onClick={() => setShowModal(true)} size="sm"><Plus className="h-4 w-4" /> Criar</Button>} />
          ) : (
            <div className="space-y-1 stagger">
              {data.data.map((sheet) => (
                <Link key={sheet.id} href={`/sales-sheets/${sheet.id}`}
                  className="flex items-center gap-4 rounded-standard bg-surface px-5 py-4 transition-all duration-200 hover:shadow-card group">
                  <Layers className="h-5 w-5 text-fg-tertiary shrink-0" strokeWidth={1.2} />
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-medium truncate group-hover:text-accent transition-colors">{sheet.title}</p>
                    <p className="text-micro text-fg-tertiary">{sheet.product.name} · {sheet.template.name}</p>
                  </div>
                  <Badge variant={STATUS_BADGE[sheet.status]}>{sheet.status}</Badge>
                  <ChevronRight className="h-4 w-4 text-fg-tertiary shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {showModal && <GenerateModal onClose={() => setShowModal(false)} onSuccess={(id) => { setShowModal(false); window.location.href = `/sales-sheets/${id}` }} />}
    </div>
  )
}
