import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'
import { BrandGovernanceService, ClientBrandProfile } from '../../brand-governance/brand-governance.service'
import { CacheService } from '../../cache/cache.service'

const COPY_DIRECTOR_CACHE_TTL_SECONDS = 60 * 60 // 1h
const COPY_DIRECTOR_CACHE_PREFIX = 'ai:copy-director:'

// Fallback tone profiles per product category — used only if DB has nothing.
// Source of truth moved to TonePreset table; edit via /brand-governance/tones.
const CATEGORY_TONE: Record<string, { tone: string; voice: string }> = {
  gamer: {
    tone: 'intenso, provocador, cheio de adrenalina — fala com quem vive para ganhar',
    voice: 'guerreiro digital implacável',
  },
  áudio: {
    tone: 'sensorial, evocativo, quase poético — desperta emoções e memórias através do som',
    voice: 'maestro da experiência sonora',
  },
  smartphone: {
    tone: 'conectado, dinâmico e aspiracional — a vida na palma da mão, sem limites',
    voice: 'companheiro do estilo de vida moderno',
  },
  notebook: {
    tone: 'produtivo, inteligente e confiável — fala com quem precisa de desempenho real',
    voice: 'parceiro de alta performance',
  },
  câmera: {
    tone: 'criativo, apaixonado, artístico — para quem vê o mundo de um jeito especial',
    voice: 'contador de histórias visuais',
  },
  'smart home': {
    tone: 'moderno, prático e futurista — o conforto inteligente que você sempre quis',
    voice: 'arquiteto do lar inteligente',
  },
  fitness: {
    tone: 'motivador, enérgico e desafiador — empurra os limites, celebra cada conquista',
    voice: 'coach pessoal incansável',
  },
  ferramenta: {
    tone: 'direto, confiável e robusto — fala com quem faz acontecer no mundo real',
    voice: 'mestre do ofício',
  },
  cozinha: {
    tone: 'acolhedor, saboroso e inspirador — cozinhar é um ato de amor',
    voice: 'chef do cotidiano',
  },
  eletrodoméstico: {
    tone: 'prático, eficiente e reassegurador — facilita a vida e economiza tempo',
    voice: 'assistente silencioso do lar',
  },
}

// CTA options per sales channel
const CHANNEL_CTA: Record<string, string[]> = {
  Varejo: [
    'Compre agora e economize',
    'Adquira na loja mais próxima',
    'Leve para casa hoje',
    'Aproveite a oferta da loja',
  ],
  Distribuidor: [
    'Solicite proposta comercial',
    'Fale com nosso representante',
    'Consulte tabela de preços',
    'Peça seu kit demonstração',
  ],
  'Varejo Premium': [
    'Experimente antes de comprar',
    'Consulte nosso especialista',
    'Agende uma demonstração exclusiva',
    'Descubra o premium Multilaser',
  ],
  'E-commerce': [
    'Compre com 1 clique',
    'Adicione ao carrinho agora',
    'Frete grátis — compre já',
    'Aproveite no site oficial',
  ],
}

export interface CopyDirectorInput {
  productName: string
  sku: string
  category: string
  description: string
  benefits: string[]
  specs: string
  channel: string
  clientProfile?: ClientBrandProfile | null
}

export interface CopyVariation {
  approach: 'emotional' | 'rational' | 'aspirational'
  headline: string
  subtitle: string
  benefits: string[]
  cta: string
}

export interface CopyDirectorOutput {
  variations: CopyVariation[]
  selectedIndex: number
  toneProfile: {
    category: string
    channel: string
    voice: string
  }
}

@Injectable()
export class CopyDirectorAgent {
  constructor(
    private promptEngine: PromptEngineService,
    private brandGovernance: BrandGovernanceService,
    private prisma: PrismaClient,
    private cache: CacheService,
  ) {}

  /**
   * Fetch up to 3 approved sales sheets in the same category as few-shot examples.
   * Returns formatted examples for prompt injection.
   */
  private async getApprovedExamples(category: string): Promise<string> {
    try {
      const sheets = await this.prisma.salesSheet.findMany({
        where: {
          status: 'APPROVED',
          product: { category: { equals: category, mode: 'insensitive' } },
        },
        orderBy: { updatedAt: 'desc' },
        take: 3,
        include: {
          versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
        },
      })
      if (!sheets.length) return ''

      const examples = sheets
        .map((s, i) => {
          const c = (s.versions[0]?.content ?? {}) as any
          const variation = Array.isArray(c.variations) && c.variations[c.selectedVariation ?? 0]
            ? c.variations[c.selectedVariation ?? 0].copy
            : c
          if (!variation?.headline) return null
          return `Exemplo aprovado ${i + 1}:
  Headline: "${variation.headline}"
  Subtitle: "${variation.subtitle ?? ''}"
  Benefits: ${Array.isArray(variation.benefits) ? variation.benefits.map((b: string) => `"${b}"`).join(', ') : '—'}
  CTA: "${variation.cta ?? ''}"`
        })
        .filter(Boolean)
      if (!examples.length) return ''
      return `\n═══ EXEMPLOS APROVADOS (drift de identidade proibido) ═══
Esses foram copies aprovados para a categoria ${category}. Mantenha coerência estilística, mas não copie literal.
${examples.join('\n\n')}
`
    } catch {
      return ''
    }
  }

  async generate(
    input: CopyDirectorInput,
    opts?: { salesSheetVersionId?: string; guidance?: string; bypassCache?: boolean },
  ): Promise<CopyDirectorOutput> {
    // Cache key = deterministic hash of input (excludes transient opts).
    // Skip cache when guidance/bypassCache present — user wants a fresh generation.
    const cacheable = !opts?.guidance && !opts?.bypassCache
    const cacheKey = cacheable
      ? `${COPY_DIRECTOR_CACHE_PREFIX}${CacheService.hashInput({
          productName: input.productName,
          sku: input.sku,
          category: input.category,
          description: input.description,
          benefits: input.benefits,
          specs: input.specs,
          channel: input.channel,
          clientProfile: input.clientProfile ?? null,
        })}`
      : null

    if (cacheKey) {
      const cached = await this.cache.get<CopyDirectorOutput>(cacheKey)
      if (cached) return cached
    }

    const categoryKey = input.category.toLowerCase()
    // DB first, fallback to inline map.
    const dbTone = await this.brandGovernance.getToneForCategory(categoryKey).catch(() => null)
    const toneData = dbTone ?? CATEGORY_TONE[categoryKey] ?? {
      tone: 'profissional, claro e persuasivo',
      voice: 'especialista de produto Multilaser',
    }

    const dbCtas = await this.brandGovernance.getCtasForChannel(input.channel).catch(() => null)
    const channelCtas = dbCtas && dbCtas.length > 0 ? dbCtas : (CHANNEL_CTA[input.channel] ?? CHANNEL_CTA['Varejo'])
    const ctaExamples = channelCtas.join(' | ')

    // Few-shot: approved examples same category
    const fewShotSection = await this.getApprovedExamples(input.category)

    // Client brand profile constraints
    const profile = input.clientProfile
    const forbiddenTerms = (profile?.forbiddenTerms ?? []).filter(Boolean)
    const requiredDisclaimers = (profile?.requiredDisclaimers ?? []).filter(Boolean)
    const voiceOverride = profile?.voice?.trim()

    const profileSection =
      voiceOverride || forbiddenTerms.length || requiredDisclaimers.length
        ? `\n═══ PERFIL DE MARCA DO CLIENTE ═══\n${voiceOverride ? `Voz do cliente: ${voiceOverride}\n` : ''}${forbiddenTerms.length ? `Termos proibidos (nunca usar): ${forbiddenTerms.join(', ')}\n` : ''}${requiredDisclaimers.length ? `Disclaimers obrigatórios (incluir no subtitle ou como CTA complementar): ${requiredDisclaimers.join(' | ')}\n` : ''}`
        : ''

    const prompt = `Você é o Copy Director da Multilaser — um dos maiores copywriters do Brasil especializado em materiais comerciais B2B e B2C.

Sua missão: criar 3 variações de copy DISTINTAS para a lâmina de vendas abaixo, cada uma com uma abordagem estratégica diferente.

═══ PRODUTO ═══
Nome: ${input.productName} (SKU: ${input.sku})
Categoria: ${input.category}
Descrição: ${input.description}
Benefícios declarados: ${input.benefits.join(', ')}
Especificações: ${input.specs}
Canal de venda: ${input.channel}

═══ PERFIL DE TOM PARA "${input.category.toUpperCase()}" ═══
Tom: ${toneData.tone}
Persona de voz: ${toneData.voice}
CTAs sugeridos para ${input.channel}: ${ctaExamples}${profileSection}${fewShotSection}

═══ AS 3 ABORDAGENS OBRIGATÓRIAS ═══

1. EMOCIONAL (approach: "emotional")
   Técnica: PAS (Problema → Agitação → Solução)
   Objetivo: conectar com sentimentos, medos, desejos e sonhos do comprador
   Headline: provoca uma emoção forte ou toca em uma dor real (max 8 palavras)
   Subtitle: amplifica a emoção e apresenta o produto como alívio (max 15 palavras)
   Benefits: 3-4 benefícios focados em como o produto faz a pessoa SE SENTIR
   CTA: emocional, urgente, pessoal

2. RACIONAL (approach: "rational")
   Técnica: Feature → Benefit (cada spec técnica = benefício concreto)
   Objetivo: convencer com dados, comparações e lógica
   Headline: destaca o diferencial técnico mais impactante (max 8 palavras)
   Subtitle: reforça com números, garantias ou provas (max 15 palavras)
   Benefits: 3-4 benefícios focados em PERFORMANCE, ECONOMIA ou DURABILIDADE
   CTA: direto, baseado em valor ou economia

3. ASPIRACIONAL (approach: "aspirational")
   Técnica: Before-After-Bridge (vida sem o produto → vida com o produto → ponte = compra)
   Objetivo: pintar uma visão de futuro melhor, status, pertencimento
   Headline: projeta a visão de futuro ou identidade que o produto representa (max 8 palavras)
   Subtitle: descreve a transformação que acontece ao adquirir o produto (max 15 palavras)
   Benefits: 3-4 benefícios focados em IDENTIDADE, STATUS ou TRANSFORMAÇÃO DE VIDA
   CTA: aspiracional, voltado ao estilo de vida

═══ REGRAS INVIOLÁVEIS ═══
- As 3 headlines DEVEM ser completamente diferentes entre si
- Cada variação deve ter um PONTO DE VISTA DISTINTO — não repita ideias com palavras diferentes
- Português brasileiro impecável, natural e comercialmente persuasivo
- Sem clichês corporativos genéricos ("inovação", "qualidade superior", "o melhor do mercado")
- Cada benefit: máximo 8 palavras, começa com verbo ou substantivo impactante
- O campo "selectedIndex" deve ser 0 (você sempre entregará a variação emocional como padrão)

Responda APENAS com JSON válido no formato:
{
  "variations": [
    {
      "approach": "emotional",
      "headline": "...",
      "subtitle": "...",
      "benefits": ["...", "...", "..."],
      "cta": "..."
    },
    {
      "approach": "rational",
      "headline": "...",
      "subtitle": "...",
      "benefits": ["...", "...", "..."],
      "cta": "..."
    },
    {
      "approach": "aspirational",
      "headline": "...",
      "subtitle": "...",
      "benefits": ["...", "...", "..."],
      "cta": "..."
    }
  ],
  "selectedIndex": 0
}`

    const runResult = await this.promptEngine.run('copy-director', { prompt }, opts)
    const output = runResult.parsedOutput as any

    const rawVariations: any[] = Array.isArray(output?.variations) ? output.variations : []

    const approaches: Array<'emotional' | 'rational' | 'aspirational'> = [
      'emotional',
      'rational',
      'aspirational',
    ]

    const variations: CopyVariation[] = approaches.map((approach, i) => {
      const raw = rawVariations.find((v: any) => v?.approach === approach) ?? rawVariations[i] ?? {}
      return {
        approach,
        headline: raw?.headline ?? this.fallbackHeadline(input, approach),
        subtitle: raw?.subtitle ?? input.description.slice(0, 80),
        benefits: Array.isArray(raw?.benefits) && raw.benefits.length > 0
          ? raw.benefits
          : input.benefits.slice(0, 4),
        cta: raw?.cta ?? channelCtas[i % channelCtas.length],
      }
    })

    const selectedIndex =
      typeof output?.selectedIndex === 'number' &&
      output.selectedIndex >= 0 &&
      output.selectedIndex < variations.length
        ? output.selectedIndex
        : 0

    const result: CopyDirectorOutput = {
      variations,
      selectedIndex,
      toneProfile: {
        category: input.category,
        channel: input.channel,
        voice: toneData.voice,
      },
    }

    if (cacheKey) {
      await this.cache.set(cacheKey, result, COPY_DIRECTOR_CACHE_TTL_SECONDS)
    }

    return result
  }

  private fallbackHeadline(
    input: CopyDirectorInput,
    approach: 'emotional' | 'rational' | 'aspirational',
  ): string {
    switch (approach) {
      case 'emotional':
        return `${input.productName} — Feito para Você`
      case 'rational':
        return `${input.productName} — Performance Comprovada`
      case 'aspirational':
        return `${input.productName} — Eleve Seu Padrão`
    }
  }
}
