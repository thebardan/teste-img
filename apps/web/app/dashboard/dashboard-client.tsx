'use client'

import Link from 'next/link'
import { useSalesSheets } from '@/lib/hooks/use-sales-sheets'
import { usePresentations } from '@/lib/hooks/use-presentations'
import { usePendingApprovals } from '@/lib/hooks/use-approvals'
import { useProducts } from '@/lib/hooks/use-products'
import { StatCard } from '@/components/ui/stat-card'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { EmptyState } from '@/components/ui/empty-state'
import {
  Layers, Presentation, Package, CheckSquare,
  ArrowRight, Sparkles,
} from 'lucide-react'
import { STATUS_BADGE_VARIANT as STATUS_BADGE, STATUS_LABELS } from '@/lib/constants'

export function DashboardClient() {
  const { data: sheetsData, isLoading: loadingSheets } = useSalesSheets()
  const { data: presentationsData, isLoading: loadingPres } = usePresentations()
  const { data: pendingApprovals, isLoading: loadingApprovals } = usePendingApprovals()
  const { data: productsData, isLoading: loadingProducts } = useProducts()

  const sheets = sheetsData?.data ?? []
  const presentations = presentationsData?.data ?? []
  const pendingTotal = pendingApprovals?.total ?? 0
  const pendingSheets = pendingApprovals?.sheets ?? []
  const pendingPresentations = pendingApprovals?.presentations ?? []
  const allPending = [...pendingSheets.map((s) => ({ ...s, type: 'sheet' as const })), ...pendingPresentations.map((p) => ({ ...p, type: 'pres' as const }))]
  const totalProducts = productsData?.total ?? 0
  const totalSheets = sheetsData?.total ?? sheets.length
  const totalPres = presentationsData?.total ?? presentations.length
  const approvedSheets = sheets.filter((s) => s.status === 'APPROVED').length
  const approvalRate = totalSheets > 0 ? Math.round((approvedSheets / totalSheets) * 100) : 0

  const isLoading = loadingSheets || loadingPres || loadingApprovals || loadingProducts

  const recentItems = [
    ...sheets.map((s) => ({ type: 'sheet' as const, id: s.id, title: s.title, status: s.status, date: s.updatedAt, product: s.product?.name })),
    ...presentations.map((p: any) => ({ type: 'pres' as const, id: p.id, title: p.title, status: p.status, date: p.updatedAt, product: p.product?.name })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  return (
    <div className="animate-slide-up">
      {/* Hero section — dark, cinematic */}
      <section className="section-dark px-6 lg:px-10 py-16">
        <h1 className="text-hero font-semibold">Dashboard</h1>
        <p className="mt-2 text-body text-white/60">Sua produção de materiais em um único lugar.</p>
      </section>

      {/* Stats — light section */}
      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-5xl grid grid-cols-2 gap-4 lg:grid-cols-4 stagger">
          {isLoading ? (
            <>
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
              <Skeleton className="h-28 rounded-lg" />
            </>
          ) : (
            <>
              <StatCard label="Lâminas" value={totalSheets} icon={Layers} />
              <StatCard label="Apresentações" value={totalPres} icon={Presentation} />
              <StatCard label="Aprovação" value={`${approvalRate}%`} icon={CheckSquare} />
              <StatCard label="Produtos" value={totalProducts} icon={Package} />
            </>
          )}
        </div>
      </section>

      {/* Quick actions — alternating dark */}
      <section className="section-dark px-6 lg:px-10 py-14">
        <div className="max-w-5xl grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/sales-sheets" className="group block rounded-lg bg-dark-surface-1 p-6 transition-all duration-300 hover:bg-dark-surface-3">
            <Layers className="h-8 w-8 text-accent mb-4" strokeWidth={1.2} />
            <h3 className="text-subheading font-semibold text-white">Nova Lâmina</h3>
            <p className="mt-1 text-caption text-white/50">Gere uma lâmina de vendas com IA</p>
            <span className="mt-4 inline-flex items-center gap-1 text-caption text-accent-bright group-hover:underline">
              Criar <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
          <Link href="/presentations" className="group block rounded-lg bg-dark-surface-1 p-6 transition-all duration-300 hover:bg-dark-surface-3">
            <Presentation className="h-8 w-8 text-accent mb-4" strokeWidth={1.2} />
            <h3 className="text-subheading font-semibold text-white">Nova Apresentação</h3>
            <p className="mt-1 text-caption text-white/50">Crie um deck de apresentação</p>
            <span className="mt-4 inline-flex items-center gap-1 text-caption text-accent-bright group-hover:underline">
              Criar <ArrowRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        </div>
      </section>

      {/* Recent + Pending — light */}
      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-5xl grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
          {/* Recent */}
          <div>
            <h2 className="text-subheading font-semibold mb-4">Atividade recente</h2>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : recentItems.length === 0 ? (
              <EmptyState icon={Sparkles} title="Nenhuma atividade" description="Gere sua primeira lamina para começar" />
            ) : (
              <div className="space-y-1">
                {recentItems.map((item) => (
                  <Link
                    key={`${item.type}-${item.id}`}
                    href={item.type === 'sheet' ? `/sales-sheets/${item.id}` : `/presentations/${item.id}`}
                    className="flex items-center gap-3 rounded-standard px-3 py-3 transition-colors hover:bg-surface group"
                  >
                    {item.type === 'sheet'
                      ? <Layers className="h-4 w-4 text-fg-tertiary shrink-0" strokeWidth={1.5} />
                      : <Presentation className="h-4 w-4 text-fg-tertiary shrink-0" strokeWidth={1.5} />
                    }
                    <div className="flex-1 min-w-0">
                      <p className="text-caption font-medium truncate group-hover:text-accent transition-colors">{item.title}</p>
                      <p className="text-micro text-fg-tertiary">{item.product ?? '—'}</p>
                    </div>
                    <Badge variant={STATUS_BADGE[item.status] ?? 'default'}>{STATUS_LABELS[item.status] ?? item.status}</Badge>
                    <span className="text-nano text-fg-tertiary">{formatRelative(item.date)}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Pending */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-subheading font-semibold">Pendentes</h2>
              {pendingTotal > 0 && <Badge variant="warning">{pendingTotal}</Badge>}
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
              </div>
            ) : allPending.length === 0 ? (
              <EmptyState icon={CheckSquare} title="Tudo em dia" className="py-10" />
            ) : (
              <div className="space-y-1.5">
                {allPending.slice(0, 6).map((item) => (
                  <Link
                    key={item.id}
                    href={item.type === 'sheet' ? `/sales-sheets/${item.id}` : `/presentations/${item.id}`}
                    className="block rounded-standard bg-surface p-3 transition-colors hover:shadow-card"
                  >
                    <p className="text-caption font-medium truncate">{item.title}</p>
                    <p className="text-micro text-fg-tertiary">{item.author?.name ?? '—'}</p>
                  </Link>
                ))}
                {allPending.length > 6 && (
                  <Link href="/approvals" className="block text-center text-caption text-accent-link hover:underline pt-2">
                    Ver todos ({pendingTotal})
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function formatRelative(dateStr: string): string {
  const now = Date.now()
  const date = new Date(dateStr).getTime()
  const diff = now - date
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}
