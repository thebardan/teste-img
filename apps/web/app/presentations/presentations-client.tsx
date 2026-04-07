'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePresentations, useGeneratePresentation } from '@/lib/hooks/use-presentations'
import { useProducts } from '@/lib/hooks/use-products'
import { cn } from '@/lib/utils'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import { Modal, ModalTitle, ModalDescription, ModalFooter } from '@/components/ui/modal'
import {
  Plus, Presentation, ChevronRight, Package, Check, ArrowRight, ArrowLeft,
} from 'lucide-react'

const statusVariantMap: Record<string, 'default' | 'accent' | 'success' | 'danger' | 'warning'> = {
  DRAFT: 'default',
  IN_REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'danger',
  ARCHIVED: 'default',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Rascunho',
  IN_REVIEW: 'Em revisão',
  APPROVED: 'Aprovado',
  REJECTED: 'Rejeitado',
  ARCHIVED: 'Arquivado',
}

// ─── Wizard ──────────────────────────────────────────────────────────────────

const STEPS = ['Produtos', 'Configuração', 'Revisar']

function WizardModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: (id: string) => void }) {
  const [step, setStep] = useState(0)
  const [selectedProducts, setSelectedProducts] = useState<string[]>([])
  const [channel, setChannel] = useState('Varejo')
  const [focus, setFocus] = useState('')
  const { data: products } = useProducts()
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

  const canNext = step === 0 ? selectedProducts.length > 0 : true
  const selectedProductNames = products?.data
    .filter((p) => selectedProducts.includes(p.id))
    .map((p) => p.name) ?? []

  return (
    <Modal open onClose={onClose} className="max-w-xl">
      <ModalTitle>Nova Apresentação</ModalTitle>
      <ModalDescription>Wizard guiado para gerar sua apresentação com IA</ModalDescription>

      {/* Progress bar */}
      <div className="mt-4 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors',
              i <= step ? 'bg-primary text-primary-foreground' : 'bg-black/[0.04] text-fg-secondary'
            )}>
              {i < step ? <Check className="h-3 w-3" /> : i + 1}
            </div>
            <span className={cn('text-xs', i <= step ? 'text-fg font-medium' : 'text-fg-secondary')}>
              {s}
            </span>
            {i < STEPS.length - 1 && <div className={cn('flex-1 h-px', i < step ? 'bg-primary' : 'bg-gray-300')} />}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="mt-5 min-h-[240px] animate-fade-in" key={step}>
        {step === 0 && (
          <div>
            <label className="text-xs font-medium text-fg-secondary mb-2 block">
              Selecione os produtos para a apresentação
            </label>
            <div className="max-h-52 overflow-y-auto rounded-lg border border-border space-y-0.5 p-1">
              {products?.data.map((p) => (
                <button
                  key={p.id}
                  onClick={() => toggleProduct(p.id)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors',
                    selectedProducts.includes(p.id)
                      ? 'bg-accent/[0.08] border border-primary/30'
                      : 'hover:bg-black/[0.04] border border-transparent',
                  )}
                >
                  <div className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border transition-colors',
                    selectedProducts.includes(p.id) ? 'bg-primary border-primary' : 'border-border'
                  )}>
                    {selectedProducts.includes(p.id) && <Check className="h-3 w-3 text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{p.name}</p>
                    <p className="text-xs text-fg-secondary font-mono">{p.sku}</p>
                  </div>
                  {p.primaryImageUrl && (
                    <img src={p.primaryImageUrl} alt="" className="h-8 w-8 rounded object-contain bg-black/[0.03]" />
                  )}
                </button>
              ))}
            </div>
            {selectedProducts.length > 0 && (
              <p className="mt-2 text-xs text-primary font-medium">{selectedProducts.length} produto(s) selecionado(s)</p>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-fg-secondary mb-1.5 block">Canal de vendas</label>
              <div className="grid grid-cols-2 gap-2">
                {['Varejo', 'Distribuidor', 'Varejo Premium', 'E-commerce'].map((c) => (
                  <button
                    key={c}
                    onClick={() => setChannel(c)}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-sm text-left transition-all',
                      channel === c
                        ? 'border-primary bg-accent/[0.08] font-medium'
                        : 'border-border hover:border-fg-tertiary'
                    )}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-fg-secondary mb-1.5 block">
                Foco da apresentação (opcional)
              </label>
              <input
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="ex: benefícios do produto, comparativo com concorrência..."
                className="w-full rounded-md border border-border bg-canvas px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50 transition-shadow"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-secondary">Produtos</span>
                <span className="text-sm font-medium">{selectedProducts.length}</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {selectedProductNames.map((name) => (
                  <Badge key={name} variant="accent" className="text-[10px]">{name}</Badge>
                ))}
              </div>
            </div>
            <div className="rounded-lg border border-border p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-fg-secondary">Canal</span>
                <span className="text-sm font-medium">{channel}</span>
              </div>
              {focus && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-fg-secondary">Foco</span>
                  <span className="text-sm">{focus}</span>
                </div>
              )}
            </div>

            {error && (
              <p className="text-xs text-danger">{(error as Error).message}</p>
            )}
          </div>
        )}
      </div>

      <ModalFooter>
        {step > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setStep(step - 1)}>
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar
          </Button>
        )}
        <div className="flex-1" />
        {step < 2 ? (
          <Button size="sm" onClick={() => setStep(step + 1)} disabled={!canNext}>
            Próximo <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleGenerate} loading={isPending} disabled={!selectedProducts.length}>
            Gerar com IA
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}

// ─── Main list ────────────────────────────────────────────────────────────────

export function PresentationsClient() {
  const [showWizard, setShowWizard] = useState(false)
  const { data, isLoading } = usePresentations()

  function handleSuccess(id: string) {
    setShowWizard(false)
    window.location.href = `/presentations/${id}`
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl animate-slide-up">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Apresentações</h1>
          <p className="mt-1 text-sm text-fg-secondary">{data?.total ?? 0} apresentações</p>
        </div>
        <Button onClick={() => setShowWizard(true)}>
          <Plus className="h-4 w-4" /> Nova Apresentação
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3 stagger">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : !data?.data.length ? (
        <EmptyState
          icon={Presentation}
          title="Nenhuma apresentação"
          description="Clique em 'Nova Apresentação' para gerar com IA"
          action={
            <Button onClick={() => setShowWizard(true)} size="sm">
              <Plus className="h-4 w-4" /> Criar primeira
            </Button>
          }
        />
      ) : (
        <div className="space-y-2 stagger">
          {data.data.map((p) => {
            const slideCount = p.versions[0]?.slides.length ?? 0
            return (
              <Link key={p.id} href={`/presentations/${p.id}`}>
                <Card elevated className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/[0.08] text-accent">
                      <Presentation className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{p.title}</p>
                      <p className="text-xs text-fg-secondary">
                        {p.client?.name ?? 'Sem cliente'}
                        {p.channel ? ` · ${p.channel}` : ''}
                        {slideCount > 0 ? ` · ${slideCount} slides` : ''}
                        {' · '}{p.template.name}
                      </p>
                    </div>
                    <Badge variant={statusVariantMap[p.status] ?? 'secondary'} className="shrink-0">
                      {STATUS_LABELS[p.status] ?? p.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-fg-tertiary shrink-0" />
                  </div>
                </Card>
              </Link>
            )
          })}
        </div>
      )}

      {showWizard && <WizardModal onClose={() => setShowWizard(false)} onSuccess={handleSuccess} />}
    </div>
  )
}
