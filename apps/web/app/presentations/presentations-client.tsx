'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePresentations, useGeneratePresentation } from '@/lib/hooks/use-presentations'
import { useProducts } from '@/lib/hooks/use-products'
import { cn } from '@/lib/utils'
import { Plus, Presentation, Loader2, ChevronRight, X } from 'lucide-react'

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Rascunho', color: 'text-muted-foreground border-border' },
  IN_REVIEW: { label: 'Em revisão', color: 'text-yellow-400 border-yellow-400/30' },
  APPROVED: { label: 'Aprovado', color: 'text-green-400 border-green-400/30' },
  REJECTED: { label: 'Rejeitado', color: 'text-red-400 border-red-400/30' },
  ARCHIVED: { label: 'Arquivado', color: 'text-muted-foreground/50 border-border/50' },
}

function GenerateModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string) => void }) {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [channel, setChannel] = useState('Varejo')
  const [focus, setFocus] = useState('')
  const { data: products } = useProducts({ isActive: true } as any)
  const { mutateAsync, isPending, error } = useGeneratePresentation()

  function toggleProduct(id: string) {
    setSelectedProducts((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  async function handleGenerate() {
    if (!selectedProducts.length) return
    const result: any = await mutateAsync({
      productIds: selectedProducts,
      channel,
      focus: focus || undefined,
    })
    onSuccess(result.id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Nova Apresentação</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Produtos <span className="text-primary">*</span>
            </label>
            <div className="max-h-40 overflow-y-auto rounded-md border border-border bg-background p-2 space-y-1">
              {products?.data.map((p) => (
                <label
                  key={p.id}
                  className={cn(
                    'flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-muted/20 transition-colors',
                    selectedProducts.includes(p.id) && 'bg-primary/10',
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                    className="accent-primary"
                  />
                  <span className="flex-1 truncate">{p.name}</span>
                  <span className="text-xs text-muted-foreground font-mono">{p.sku}</span>
                </label>
              ))}
            </div>
            {selectedProducts.length > 0 && (
              <p className="mt-1 text-xs text-primary">{selectedProducts.length} produto(s) selecionado(s)</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
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

            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Foco (opcional)</label>
              <input
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="ex: benefícios, preço..."
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/50"
              />
            </div>
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
            disabled={!selectedProducts.length || isPending}
            className="flex-1 flex items-center justify-center gap-2 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</> : 'Gerar com IA'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function PresentationsClient() {
  const [showModal, setShowModal] = useState(false)
  const { data, isLoading } = usePresentations()

  function handleSuccess(id: string) {
    setShowModal(false)
    window.location.href = `/presentations/${id}`
  }

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Apresentações</h1>
          <p className="mt-1 text-sm text-muted-foreground">{data?.total ?? 0} apresentações</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Nova Apresentação
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
          <Presentation className="mb-3 h-10 w-10 text-muted-foreground/40" />
          <p className="font-medium">Nenhuma apresentação ainda</p>
          <p className="mt-1 text-sm text-muted-foreground">Clique em "Nova Apresentação" para gerar com IA</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.data.map((p) => {
            const st = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.DRAFT
            const slideCount = p.versions[0]?.slides.length ?? 0
            return (
              <Link
                key={p.id}
                href={`/presentations/${p.id}`}
                className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 hover:border-primary/50 transition-colors"
              >
                <Presentation className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{p.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.client?.name ?? 'Sem cliente'}
                    {p.channel ? ` · ${p.channel}` : ''}
                    {slideCount > 0 ? ` · ${slideCount} slides` : ''}
                    {' · '}{p.template.name}
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
