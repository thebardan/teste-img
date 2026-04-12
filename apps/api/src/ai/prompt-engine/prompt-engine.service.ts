import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { GeminiTextProvider } from '../providers/gemini/gemini-text.provider'

export interface PromptRunResult {
  promptId: string
  promptVersion: string
  renderedPrompt: string
  rawResponse: string
  parsedOutput: unknown
  durationMs: number
  success: boolean
  error?: string
}

@Injectable()
export class PromptEngineService {
  constructor(
    private prisma: PrismaClient,
    private textProvider: GeminiTextProvider,
  ) {}

  renderPrompt(template: string, vars: Record<string, string>): string {
    return Object.entries(vars).reduce(
      (tpl, [key, value]) => tpl.replaceAll(`{{${key}}}`, value ?? ''),
      template,
    )
  }

  async run(
    promptId: string,
    vars: Record<string, string>,
    opts?: { salesSheetVersionId?: string; presentationVersionId?: string },
  ): Promise<PromptRunResult> {
    // Try to load prompt from DB; fall back to inline template map
    const dbPrompt = await this.prisma.promptTemplate.findFirst({
      where: { promptId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    const template = dbPrompt?.template ?? INLINE_PROMPTS[promptId] ?? ''
    const version = dbPrompt?.version ?? '1.0.0'
    const rendered = this.renderPrompt(template, vars)

    let rawResponse = ''
    let parsedOutput: unknown = null
    let success = false
    let error: string | undefined
    const start = Date.now()

    try {
      const result = await this.textProvider.generate(rendered)
      rawResponse = result.text

      // Try to parse JSON response
      const jsonMatch = rawResponse.match(/```json\s*([\s\S]*?)\s*```/) ?? rawResponse.match(/(\{[\s\S]*\})/)
      if (jsonMatch) {
        parsedOutput = JSON.parse(jsonMatch[1] ?? jsonMatch[0])
      } else {
        parsedOutput = { text: rawResponse }
      }
      success = true
    } catch (err: any) {
      error = err.message
      rawResponse = ''
    }

    const durationMs = Date.now() - start

    // Save inference log
    await this.prisma.inferenceLog.create({
      data: {
        promptId,
        promptVersion: version,
        provider: 'gemini-2.0-flash',
        renderedPrompt: rendered,
        rawResponse,
        parsedOutput: parsedOutput as any,
        durationMs,
        success,
        error,
        salesSheetVersionId: opts?.salesSheetVersionId,
        presentationVersionId: opts?.presentationVersionId,
      },
    })

    return { promptId, promptVersion: version, renderedPrompt: rendered, rawResponse, parsedOutput, durationMs, success, error }
  }
}

// Fallback inline prompts (used when no DB record exists)
export const INLINE_PROMPTS: Record<string, string> = {
  'sales-headline': `Você é um copywriter sênior especializado em lâminas de vendas B2B e B2C.
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

  'benefits-generator': `Você é um especialista em marketing de produto da Multilaser.
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

  'sales-sheet-copy': `Você é um copywriter sênior especializado em materiais comerciais Multilaser.
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

  'visual-direction': `Você é um diretor de arte de uma agência criativa premiada, especializado em tech e inovação.
Crie uma direção visual OUSADA e CONTEMPORÂNEA para a lâmina de vendas do produto abaixo.

Produto: {{productName}}
Categoria: {{category}}
Headline: {{headline}}

═══ ESTÉTICAS DISPONÍVEIS (escolha a que melhor combina com o produto) ═══

• NEON TECH — Fundo escuro profundo (#0a0a0f, #0d0d1a) com acentos neon vibrantes (ciano #00f5ff, magenta #ff00c8, verde elétrico #00ff88). Gradientes luminosos, glow effects, sensação de interface futurista. Ideal para: periféricos gamer, áudio, gadgets.

• CYBERPUNK — Preto com roxo intenso (#7b2ff7, #c850ff), azul elétrico (#0091ff), e rosa quente (#ff2d78). Atmosfera urbana noturna, luzes de LED, reflexos metálicos. Ideal para: smartphones, acessórios, wearables.

• MINIMAL PREMIUM — Branco/cinza muito claro (#f8f8fa, #e8e8ec) com um único acento vibrante (azul #0066ff ou laranja #ff6b00). Clean extremo, espaço generoso, fotografia de produto impecável. Ideal para: notebooks, tablets, eletrodomésticos premium.

• GRADIENTE AURORA — Gradientes fluidos e orgânicos entre 2-3 cores vibrantes (ex: #667eea → #764ba2, ou #f093fb → #f5576c, ou #4facfe → #00f2fe). Fundo escuro para o gradiente brilhar. Sensação de tecnologia humanizada. Ideal para: smart home, câmeras, fitness.

• BOLD INDUSTRIAL — Amarelo/laranja industrial (#ffbe0b, #ff6b00) sobre preto (#111) ou grafite (#1a1a1a). Texturas sutis de metal ou concreto. Robustez, confiança. Ideal para: ferramentas, equipamentos, produtos robustos.

• WARM LIFESTYLE — Tons terrosos aquecidos (#d4a574, #c17d52) com verde natural (#4a7c59) sobre fundos suaves (#faf5f0). Luz dourada, sensação caseira e acolhedora. Ideal para: cozinha, eletrodomésticos, casa.

• ELECTRIC SPORT — Verde limão (#c5f82a), azul cobalto (#0055ff), ou laranja energético (#ff5e00) sobre preto. Dinâmico, energético, em movimento. Ideal para: fitness, esportes, smartwatches.

═══ INSTRUÇÕES ═══
1. Analise o produto e categoria para escolher a estética MAIS IMPACTANTE
2. NÃO escolha sempre a mesma — varie conforme o produto
3. As cores devem ser VIBRANTES e CONTEMPORÂNEAS — nada de paletas corporativas genéricas
4. O "imageAmbiance" deve ser uma cena cinematográfica específica, não genérica
5. O "emotionalTone" deve ser evocativo e preciso (ex: "poder silencioso", "adrenalina controlada", "futuro acessível")

Responda APENAS com JSON:
{"style": "nome da estética escolhida", "colors": ["#hex1", "#hex2", "#hex3"], "imageAmbiance": "descrição cinematográfica da cena de composição", "emotionalTone": "tom emocional evocativo"}`,

  'image-generation': `Crie uma imagem comercial de alta qualidade para lâmina de vendas.

Produto: {{productName}}
Ambiente: {{imageAmbiance}}
Estilo: {{style}}
Tom: {{emotionalTone}}

Requisitos:
- Imagem clean, moderna e comercial
- Espaço negativo à direita para texto
- Iluminação profissional de produto
- Fundo compatível com branding Multilaser`,

  'slide-structure': `Você é um estrategista de apresentações comerciais B2B.
Monte a estrutura narrativa de 5 slides para a apresentação abaixo.

Cliente: {{clientName}}
Produtos: {{products}}
Foco: {{focus}}
Canal: {{channel}}

Crie 5 slides com:
- type: cover | context | products | benefits | closing
- title: título do slide
- subtitle: subtítulo opcional
- body: array de 2-4 pontos principais
- cta: chamada para ação (apenas no slide closing)

Responda APENAS com JSON:
{"slides": [{"type": "cover", "title": "...", "subtitle": "...", "body": [], "cta": null}, ...]}`,

  'slide-copy': `Você é um copywriter especializado em apresentações comerciais Multilaser.
Enriqueça o conteúdo do slide abaixo com copy persuasivo.

Tipo: {{slideType}}
Título: {{title}}
Contexto: {{context}}

Gere copy refinado mantendo o título mas enriquecendo o conteúdo.
Responda APENAS com JSON:
{"title": "...", "subtitle": "...", "body": ["...", "..."]}`,

  'qa-check': `Você é um especialista em QA de materiais comerciais da Multilaser.
Analise o conteúdo abaixo e identifique problemas de qualidade.

Tipo: {{type}}
Assunto: {{subject}}
Conteúdo:
{{content}}

Verifique:
- Ortografia e gramática em português
- Claims exagerados ou não verificáveis
- Tom inconsistente com branding profissional
- Texto confuso ou pouco persuasivo
- Inconsistências entre título e conteúdo

Responda APENAS com JSON (array vazio se não houver problemas):
{"issues": ["descrição do problema 1", "descrição do problema 2"]}`,

  'copy-director': `{{prompt}}`,

  'visual-system': `Você é um diretor de arte e designer de sistemas visuais, especializado em criar identidades visuais únicas para produtos tech e inovação.
Crie uma direção visual COMPLETAMENTE ORIGINAL para o produto abaixo — não escolha de buckets pré-definidos. Parta da essência do produto para chegar a algo singular.

Produto: {{productName}}
Categoria: {{category}}
Headline: {{headline}}

═══ SUA MISSÃO ═══
Analise a alma do produto: o que ele representa emocionalmente? Que universo visual ele habita?
A partir disso, crie um sistema visual que seja imediatamente reconhecível como único para ESTE produto.

═══ REGRAS CRIATIVAS ═══
1. A cor dominante deve nascer da essência do produto — não de uma lista de opções
2. Varie o colorScheme com inteligência: complementary para tensão e impacto, analogous para harmonia e fluidez, triadic para energia e variedade
3. O darkMode deve refletir o posicionamento: produtos premium/gamer tendem ao escuro, lifestyle/doméstico ao claro
4. O backgroundType deve reforçar a personalidade: mesh para complexidade, gradient-radial para foco, gradient-linear para movimento, solid para minimalismo
5. Texture deve ser usada com propósito — noise para orgânico, grid para tech, dots para modernidade, none para pureza
6. O style deve ser uma descrição criativa em 2-4 palavras (ex: "cyberpunk suave", "minimalismo brutal", "organicidade digital")
7. O emotionalTone deve ser exatamente DUAS PALAVRAS evocativas e precisas (ex: "poder silencioso", "adrenalina controlada", "futuro acessível")

Responda APENAS com JSON válido:
{
  "dominantColor": "#hexcode",
  "darkMode": true,
  "colorScheme": "complementary",
  "backgroundType": "gradient-linear",
  "gradientAngle": 135,
  "texture": "none",
  "style": "descrição criativa do estilo",
  "emotionalTone": "duas palavras"
}`,
}
