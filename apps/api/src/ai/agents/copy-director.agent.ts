import { Injectable } from '@nestjs/common'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'

// Tone profiles per product category
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
  constructor(private promptEngine: PromptEngineService) {}

  async generate(
    input: CopyDirectorInput,
    opts?: { salesSheetVersionId?: string },
  ): Promise<CopyDirectorOutput> {
    const categoryKey = input.category.toLowerCase()
    const toneData = CATEGORY_TONE[categoryKey] ?? {
      tone: 'profissional, claro e persuasivo',
      voice: 'especialista de produto Multilaser',
    }

    const channelCtas = CHANNEL_CTA[input.channel] ?? CHANNEL_CTA['Varejo']
    const ctaExamples = channelCtas.join(' | ')

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
CTAs sugeridos para ${input.channel}: ${ctaExamples}

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

    const result = await this.promptEngine.run('copy-director', { prompt }, opts)
    const output = result.parsedOutput as any

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

    return {
      variations,
      selectedIndex,
      toneProfile: {
        category: input.category,
        channel: input.channel,
        voice: toneData.voice,
      },
    }
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
