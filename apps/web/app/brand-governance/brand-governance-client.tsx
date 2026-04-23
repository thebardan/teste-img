'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  useTonePresets,
  useUpsertTone,
  useDeleteTone,
  useChannelCtas,
  useUpsertChannelCtas,
  useDeleteChannelCtas,
} from '@/lib/hooks/use-brand-governance'
import { Pencil, Trash2, Plus, Palette, MessageSquareQuote } from 'lucide-react'

type Tab = 'tones' | 'channel-ctas'

const TABS: { value: Tab; label: string }[] = [
  { value: 'tones', label: 'Tons por categoria' },
  { value: 'channel-ctas', label: 'CTAs por canal' },
]

export function BrandGovernanceClient() {
  const [tab, setTab] = useState<Tab>('tones')

  return (
    <div className="animate-slide-up">
      <section className="section-dark px-6 lg:px-10 py-16">
        <h1 className="text-hero font-semibold">Brand Governance</h1>
        <p className="mt-2 text-body text-white/60">
          Configure tons de voz por categoria e CTAs por canal. Usados pelo Copy Director em toda geração.
        </p>
      </section>

      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-5xl">
          <div className="mb-6 flex gap-1 rounded-standard bg-black/[0.04] dark:bg-white/[0.06] p-1 w-fit">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={cn(
                  'rounded-comfortable px-3 py-1.5 text-caption transition-colors',
                  tab === t.value ? 'bg-surface text-fg shadow-sm' : 'text-fg-secondary hover:text-fg',
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'tones' ? <TonesPanel /> : <ChannelCtasPanel />}
        </div>
      </section>
    </div>
  )
}

// ─── Tones ────────────────────────────────────────────────────────────────────

function TonesPanel() {
  const { data, isLoading } = useTonePresets()
  const { mutateAsync: upsert, isPending: saving } = useUpsertTone()
  const { mutateAsync: remove, isPending: deleting } = useDeleteTone()
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleSave(p: { category: string; tone: string; voice: string; isActive?: boolean }) {
    await upsert(p)
    setEditing(null)
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover este tom? Copy Director cairá para o default da categoria.')) return
    await remove(id)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="h-4 w-4 text-accent" />
            <CardTitle className="text-sm">Tons por categoria</CardTitle>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>
            <Plus className="h-3 w-3" /> Novo tom
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {creating && (
          <ToneEditor
            initial={{ category: '', tone: '', voice: '', isActive: true }}
            onSave={handleSave}
            onCancel={() => setCreating(false)}
            isSaving={saving}
          />
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-14 rounded" />
            ))}
          </div>
        )}

        {data?.map((p) =>
          editing === p.id ? (
            <ToneEditor
              key={p.id}
              initial={p}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
              isSaving={saving}
            />
          ) : (
            <div
              key={p.id}
              className={cn(
                'rounded border border-border px-3 py-2 text-sm flex items-start gap-3',
                !p.isActive && 'opacity-60',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">{p.category}</span>
                  {!p.isActive && <span className="rounded bg-fg/10 px-1 py-0.5 text-[10px]">inativo</span>}
                </div>
                <p className="text-caption text-fg-secondary">
                  <span className="font-medium">Tom:</span> {p.tone}
                </p>
                <p className="text-caption text-fg-secondary mt-0.5">
                  <span className="font-medium">Voz:</span> {p.voice}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => setEditing(p.id)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(p.id)}
                  loading={deleting}
                  className="text-danger"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ),
        )}

        {!isLoading && (data?.length ?? 0) === 0 && !creating && (
          <p className="text-center text-caption text-fg-tertiary py-8">
            Nenhum tom configurado. Copy Director usará fallback genérico.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ToneEditor({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: { category: string; tone: string; voice: string; isActive: boolean }
  onSave: (p: { category: string; tone: string; voice: string; isActive: boolean }) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}) {
  const [category, setCategory] = useState(initial.category)
  const [tone, setTone] = useState(initial.tone)
  const [voice, setVoice] = useState(initial.voice)
  const [isActive, setActive] = useState(initial.isActive)
  const isNew = !initial.category

  return (
    <div className="rounded border border-accent/30 bg-accent/[0.04] p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1 block">
            Categoria
          </label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={!isNew}
            placeholder="gamer, audio, smartphone..."
            className="w-full rounded border border-border bg-background px-2 py-1 text-caption outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-1.5 text-caption text-fg-secondary">
            <input type="checkbox" checked={isActive} onChange={(e) => setActive(e.target.checked)} />
            ativo
          </label>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1 block">
          Tom
        </label>
        <textarea
          value={tone}
          onChange={(e) => setTone(e.target.value)}
          rows={2}
          placeholder="intenso, provocador..."
          className="w-full rounded border border-border bg-background px-2 py-1 text-caption outline-none focus:ring-1 focus:ring-accent resize-none"
        />
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1 block">
          Voz (persona)
        </label>
        <input
          value={voice}
          onChange={(e) => setVoice(e.target.value)}
          placeholder="guerreiro digital implacável..."
          className="w-full rounded border border-border bg-background px-2 py-1 text-caption outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onSave({ category, tone, voice, isActive })}
          loading={isSaving}
          disabled={!category.trim() || !tone.trim() || !voice.trim()}
          className="flex-1"
        >
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}

// ─── Channel CTAs ─────────────────────────────────────────────────────────────

function ChannelCtasPanel() {
  const { data, isLoading } = useChannelCtas()
  const { mutateAsync: upsert, isPending: saving } = useUpsertChannelCtas()
  const { mutateAsync: remove, isPending: deleting } = useDeleteChannelCtas()
  const [editing, setEditing] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  async function handleSave(p: { channel: string; ctas: string[]; isActive?: boolean }) {
    await upsert(p)
    setEditing(null)
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover CTAs deste canal?')) return
    await remove(id)
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4 text-accent" />
            <CardTitle className="text-sm">CTAs por canal</CardTitle>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>
            <Plus className="h-3 w-3" /> Novo canal
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {creating && (
          <CtaEditor
            initial={{ channel: '', ctas: [''], isActive: true }}
            onSave={handleSave}
            onCancel={() => setCreating(false)}
            isSaving={saving}
          />
        )}

        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded" />
            ))}
          </div>
        )}

        {data?.map((p) =>
          editing === p.id ? (
            <CtaEditor
              key={p.id}
              initial={p}
              onSave={handleSave}
              onCancel={() => setEditing(null)}
              isSaving={saving}
            />
          ) : (
            <div
              key={p.id}
              className={cn(
                'rounded border border-border px-3 py-2 text-sm flex items-start gap-3',
                !p.isActive && 'opacity-60',
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wider text-accent">{p.channel}</span>
                  {!p.isActive && <span className="rounded bg-fg/10 px-1 py-0.5 text-[10px]">inativo</span>}
                </div>
                <ul className="space-y-0.5">
                  {p.ctas.map((c, i) => (
                    <li key={i} className="text-caption text-fg-secondary flex gap-2">
                      <span className="text-fg-tertiary">•</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button size="icon" variant="ghost" onClick={() => setEditing(p.id)}>
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleDelete(p.id)}
                  loading={deleting}
                  className="text-danger"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ),
        )}

        {!isLoading && (data?.length ?? 0) === 0 && !creating && (
          <p className="text-center text-caption text-fg-tertiary py-8">
            Nenhum CTA configurado. Copy Director usará fallback de Varejo.
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function CtaEditor({
  initial,
  onSave,
  onCancel,
  isSaving,
}: {
  initial: { channel: string; ctas: string[]; isActive: boolean }
  onSave: (p: { channel: string; ctas: string[]; isActive: boolean }) => Promise<void>
  onCancel: () => void
  isSaving: boolean
}) {
  const [channel, setChannel] = useState(initial.channel)
  const [ctas, setCtas] = useState<string[]>(initial.ctas.length ? initial.ctas : [''])
  const [isActive, setActive] = useState(initial.isActive)
  const isNew = !initial.channel

  function updateCta(i: number, v: string) {
    const next = [...ctas]
    next[i] = v
    setCtas(next)
  }

  function removeCta(i: number) {
    setCtas(ctas.filter((_, idx) => idx !== i))
  }

  const cleanedCtas = ctas.map((c) => c.trim()).filter(Boolean)

  return (
    <div className="rounded border border-accent/30 bg-accent/[0.04] p-3 space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1 block">
            Canal
          </label>
          <input
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            disabled={!isNew}
            placeholder="Varejo, E-commerce, Distribuidor..."
            className="w-full rounded border border-border bg-background px-2 py-1 text-caption outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
          />
        </div>
        <div className="flex items-end gap-2">
          <label className="flex items-center gap-1.5 text-caption text-fg-secondary">
            <input type="checkbox" checked={isActive} onChange={(e) => setActive(e.target.checked)} />
            ativo
          </label>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold uppercase tracking-widest text-fg-tertiary mb-1 block">
          CTAs sugeridos
        </label>
        <div className="space-y-1">
          {ctas.map((c, i) => (
            <div key={i} className="flex gap-1">
              <input
                value={c}
                onChange={(e) => updateCta(i, e.target.value)}
                placeholder={`CTA ${i + 1}`}
                className="flex-1 rounded border border-border bg-background px-2 py-1 text-caption outline-none focus:ring-1 focus:ring-accent"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => removeCta(i)}
                disabled={ctas.length === 1}
                className="text-fg-tertiary hover:text-danger"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
          <button
            onClick={() => setCtas([...ctas, ''])}
            className="text-[10px] text-accent hover:underline"
          >
            + adicionar CTA
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => onSave({ channel, ctas: cleanedCtas, isActive })}
          loading={isSaving}
          disabled={!channel.trim() || cleanedCtas.length === 0}
          className="flex-1"
        >
          Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </div>
  )
}
