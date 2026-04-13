'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Sparkles, FileText, Copy, Check } from 'lucide-react'

interface PromptInfo {
  id: string
  label: string
  description: string
  category: 'copy' | 'visual' | 'qa' | 'presentation'
  variables: string[]
  template: string
}

const PROMPTS: PromptInfo[] = [
  {
    id: 'sales-headline',
    label: 'Headline de Vendas',
    description: 'Gera headline e subtítulo impactantes para lâminas',
    category: 'copy',
    variables: ['productName', 'summary', 'targetAudience', 'channel'],
    template: `Você é um copywriter sênior especializado em lâminas de vendas B2B e B2C.
Crie headline e subtítulo para o produto abaixo.

Produto: {{productName}}
Resumo: {{summary}}
Público: {{targetAudience}}
Canal: {{channel}}

Regras:
- Headline: máximo 8 palavras, impactante, vendável
- Subtítulo: máximo 15 palavras, foco em benefício
- Idioma: português brasileiro

Responda APENAS com JSON:
{"headline": "...", "subtitle": "..."}`,
  },
  {
    id: 'benefits-generator',
    label: 'Gerador de Benefícios',
    description: 'Gera 3 a 5 benefícios comerciais otimizados',
    category: 'copy',
    variables: ['productName', 'declaredBenefits', 'category'],
    template: `Você é um especialista em marketing de produto da Multilaser.
Gere 3 a 5 benefícios comerciais para o produto abaixo.

Produto: {{productName}}
Benefícios declarados: {{declaredBenefits}}
Categoria: {{category}}

Regras:
- Cada benefício máximo 8 palavras
- Foco em valor percebido
- Idioma: português brasileiro

Responda APENAS com JSON:
{"benefits": ["...", "...", "..."]}`,
  },
  {
    id: 'sales-sheet-copy',
    label: 'Copy Completo de Lâmina',
    description: 'Gera conteúdo completo: headline, subtítulo, benefícios e CTA',
    category: 'copy',
    variables: ['productName', 'sku', 'category', 'description', 'benefits', 'specs', 'channel'],
    template: `Você é um copywriter sênior especializado em materiais comerciais Multilaser.
Gere o conteúdo completo para uma lâmina de vendas.

Produto: {{productName}} (SKU: {{sku}})
Categoria: {{category}}
Descrição: {{description}}
Benefícios: {{benefits}}
Especificações: {{specs}}
Canal: {{channel}}

Gere:
- Headline impactante (max 8 palavras)
- Subtítulo de apoio (max 15 palavras)
- 3 a 5 benefícios otimizados (max 8 palavras cada)
- CTA persuasivo (max 5 palavras)

Responda APENAS com JSON:
{"headline": "...", "subtitle": "...", "benefits": ["...", "..."], "cta": "..."}`,
  },
  {
    id: 'visual-direction',
    label: 'Direção Visual',
    description: 'Define estética, cores e tom emocional da composição',
    category: 'visual',
    variables: ['productName', 'category', 'headline'],
    template: `Você é um diretor de arte de uma agência criativa premiada.
Crie uma direção visual OUSADA e CONTEMPORÂNEA para a lâmina.

Produto: {{productName}}
Categoria: {{category}}
Headline: {{headline}}

Estéticas: NEON TECH, CYBERPUNK, MINIMAL PREMIUM, GRADIENTE AURORA, BOLD INDUSTRIAL, WARM LIFESTYLE, ELECTRIC SPORT

Responda com JSON:
{"style": "...", "colors": ["#hex1", "#hex2", "#hex3"], "imageAmbiance": "...", "emotionalTone": "..."}`,
  },
  {
    id: 'image-generation',
    label: 'Geração de Imagem',
    description: 'Prompt para criação de imagem comercial de produto',
    category: 'visual',
    variables: ['productName', 'imageAmbiance', 'style', 'emotionalTone'],
    template: `Crie uma imagem comercial de alta qualidade para lâmina de vendas.

Produto: {{productName}}
Ambiente: {{imageAmbiance}}
Estilo: {{style}}
Tom: {{emotionalTone}}

Requisitos:
- Imagem clean, moderna e comercial
- Espaço negativo à direita para texto
- Iluminação profissional de produto
- Fundo compatível com branding Multilaser`,
  },
  {
    id: 'slide-structure',
    label: 'Estrutura de Slides',
    description: 'Monta estrutura narrativa de 5 slides para apresentações',
    category: 'presentation',
    variables: ['clientName', 'products', 'focus', 'channel'],
    template: `Você é um estrategista de apresentações comerciais B2B.
Monte a estrutura narrativa de 5 slides.

Cliente: {{clientName}}
Produtos: {{products}}
Foco: {{focus}}
Canal: {{channel}}

Crie 5 slides com: type, title, subtitle, body, cta

Responda com JSON:
{"slides": [{"type": "cover", "title": "...", "subtitle": "...", "body": [], "cta": null}, ...]}`,
  },
  {
    id: 'slide-copy',
    label: 'Copy de Slide',
    description: 'Enriquece conteúdo de um slide com copy persuasivo',
    category: 'presentation',
    variables: ['slideType', 'title', 'context'],
    template: `Você é um copywriter especializado em apresentações comerciais Multilaser.
Enriqueça o conteúdo do slide abaixo com copy persuasivo.

Tipo: {{slideType}}
Título: {{title}}
Contexto: {{context}}

Responda com JSON:
{"title": "...", "subtitle": "...", "body": ["...", "..."]}`,
  },
  {
    id: 'qa-check',
    label: 'Verificação de QA',
    description: 'Analisa qualidade de conteúdo gerado e identifica problemas',
    category: 'qa',
    variables: ['type', 'subject', 'content'],
    template: `Você é um especialista em QA de materiais comerciais da Multilaser.
Analise o conteúdo abaixo e identifique problemas de qualidade.

Tipo: {{type}}
Assunto: {{subject}}
Conteúdo: {{content}}

Verifique: ortografia, claims exagerados, tom inconsistente, texto confuso, inconsistências.

Responda com JSON:
{"issues": ["descrição do problema 1", "descrição do problema 2"]}`,
  },
]

const CATEGORY_LABELS: Record<string, string> = {
  copy: 'Copywriting',
  visual: 'Visual',
  qa: 'Qualidade',
  presentation: 'Apresentação',
}

const CATEGORY_BADGE: Record<string, 'accent' | 'success' | 'warning' | 'danger'> = {
  copy: 'accent',
  visual: 'success',
  qa: 'warning',
  presentation: 'accent',
}

export function PromptStudioClient() {
  const [selectedId, setSelectedId] = useState(PROMPTS[0].id)
  const [copied, setCopied] = useState(false)

  const selected = PROMPTS.find((p) => p.id === selectedId) ?? PROMPTS[0]

  function handleCopy() {
    navigator.clipboard.writeText(selected.template)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="animate-slide-up">
      {/* Hero section — dark */}
      <section className="section-dark px-6 lg:px-10 py-16">
        <h1 className="text-hero font-semibold">Prompt Studio</h1>
        <p className="mt-2 text-body text-white/60">
          {PROMPTS.length} prompts configurados no pipeline de IA
        </p>
      </section>

      {/* Split view */}
      <section className="px-6 lg:px-10 py-10">
        <div className="max-w-6xl flex gap-6 flex-col lg:flex-row">
          {/* Left — prompt list */}
          <div className="lg:w-72 shrink-0 space-y-1 stagger">
            {PROMPTS.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={cn(
                  'w-full text-left rounded-standard px-3 py-2.5 transition-all',
                  selectedId === p.id
                    ? 'bg-accent/[0.08] ring-1 ring-accent/30'
                    : 'bg-surface hover:shadow-card',
                )}
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-fg-tertiary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-caption font-medium truncate">{p.label}</p>
                    <p className="text-nano text-fg-tertiary truncate">{p.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Right — prompt detail */}
          <div className="flex-1 min-w-0">
            <div className="rounded-standard bg-surface p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-tile font-semibold">{selected.label}</h2>
                    <Badge variant={CATEGORY_BADGE[selected.category]}>
                      {CATEGORY_LABELS[selected.category]}
                    </Badge>
                  </div>
                  <p className="text-caption text-fg-secondary">{selected.description}</p>
                </div>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 rounded-comfortable px-2.5 py-1.5 text-micro text-fg-secondary hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copiado' : 'Copiar'}
                </button>
              </div>

              {/* Variables */}
              <div className="mb-4">
                <p className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-2">Variáveis</p>
                <div className="flex flex-wrap gap-1.5">
                  {selected.variables.map((v) => (
                    <span
                      key={v}
                      className="rounded-pill bg-accent/[0.08] px-2 py-0.5 text-micro font-mono text-accent"
                    >
                      {'{{' + v + '}}'}
                    </span>
                  ))}
                </div>
              </div>

              {/* Template */}
              <div>
                <p className="text-micro font-semibold uppercase tracking-wide text-fg-tertiary mb-2">Template</p>
                <pre className="rounded-standard bg-black/[0.03] dark:bg-white/[0.06] p-4 text-micro font-mono text-fg-secondary leading-relaxed overflow-x-auto whitespace-pre-wrap">
                  {selected.template}
                </pre>
              </div>

              {/* ID */}
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-nano text-fg-tertiary">
                  Prompt ID: <span className="font-mono">{selected.id}</span> · Versão inline · Pode ser sobrescrito via banco de dados
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
