'use client'

import Link from 'next/link'
import { usePresentation } from '@/lib/hooks/use-presentations'
import { ArrowLeft, Presentation, Layers, Building2 } from 'lucide-react'

const SLIDE_TYPE_LABELS: Record<string, string> = {
  cover: 'Capa',
  context: 'Contexto',
  products: 'Produtos',
  benefits: 'Benefícios',
  closing: 'Encerramento',
}

export function PresentationDetailClient({ id }: { id: string }) {
  const { data: presentation, isLoading } = usePresentation(id)

  if (isLoading) return (
    <div className="p-8 space-y-4 animate-pulse">
      <div className="h-6 w-48 rounded bg-muted/20" />
      <div className="h-10 w-96 rounded bg-muted/20" />
      <div className="h-80 rounded-lg bg-muted/20" />
    </div>
  )

  if (!presentation) return <div className="p-8 text-sm text-destructive">Apresentação não encontrada.</div>

  const latestVersion = presentation.versions?.[0]
  const slides = latestVersion?.slides ?? []

  return (
    <div className="p-8 max-w-5xl">
      <Link
        href="/presentations"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Apresentações
      </Link>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">{presentation.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {presentation.client?.name ?? 'Sem cliente'}
            {presentation.channel ? ` · ${presentation.channel}` : ''}
            {presentation.focus ? ` · Foco: ${presentation.focus}` : ''}
            {' · '}{presentation.template?.name}
          </p>
        </div>
        <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          {presentation.status}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Slide Deck */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            <Layers className="h-3.5 w-3.5" />
            {slides.length} Slides — v{latestVersion?.versionNumber ?? 1}
          </div>

          {slides.length === 0 ? (
            <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-sm text-muted-foreground">
              Nenhum slide gerado
            </div>
          ) : (
            slides.map((slide, index) => {
              const content = slide.content as any
              const typeLabel = SLIDE_TYPE_LABELS[content?.type] ?? content?.type ?? `Slide ${index + 1}`
              return (
                <div
                  key={slide.id ?? index}
                  className="rounded-lg border border-border bg-card p-5 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {index + 1}. {typeLabel}
                    </span>
                  </div>
                  {content?.title && (
                    <h3 className="font-semibold leading-snug">{content.title}</h3>
                  )}
                  {content?.subtitle && (
                    <p className="text-sm text-muted-foreground">{content.subtitle}</p>
                  )}
                  {content?.body?.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {(content.body as string[]).map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                  {content?.cta && (
                    <div className="mt-3 inline-block rounded-md bg-primary/20 px-3 py-1 text-xs font-medium text-primary">
                      {content.cta}
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Client */}
          {presentation.client && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" /> Cliente
              </div>
              <p className="font-medium text-sm">{presentation.client.name}</p>
              {presentation.client.segment && (
                <p className="text-xs text-muted-foreground mt-0.5">{presentation.client.segment}</p>
              )}
            </div>
          )}

          {/* Versions */}
          {presentation.versions.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Presentation className="h-3.5 w-3.5" /> Versões
              </div>
              <div className="space-y-2">
                {presentation.versions.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1.5 last:border-0">
                    <span>v{v.versionNumber}</span>
                    <span className="text-xs text-muted-foreground">{v.slides.length} slides</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Approvals */}
          {presentation.approvals.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Aprovações</p>
              <div className="space-y-2">
                {presentation.approvals.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-sm border-b border-border/50 py-1.5 last:border-0">
                    <span className="text-muted-foreground text-xs">{a.approver.name}</span>
                    <span className={`text-xs rounded-full border px-2 py-0.5 ${
                      a.status === 'APPROVED'
                        ? 'text-green-400 border-green-400/30'
                        : a.status === 'REJECTED'
                        ? 'text-red-400 border-red-400/30'
                        : 'text-muted-foreground border-border'
                    }`}>
                      {a.status === 'APPROVED' ? 'Aprovado' : a.status === 'REJECTED' ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
