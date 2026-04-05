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

  'visual-direction': `Você é um diretor de arte especializado em materiais comerciais premium.
Crie uma direção visual para a lâmina de vendas do produto abaixo.

Produto: {{productName}}
Categoria: {{category}}
Headline: {{headline}}

Gere:
- Estilo visual (ex: clean, tech, lifestyle, bold)
- Paleta de cores sugerida (2-3 cores hex)
- Ambiente de composição para a imagem (ex: "produto em mesa clean com iluminação estúdio")
- Tom emocional

Responda APENAS com JSON:
{"style": "...", "colors": ["#...", "#..."], "imageAmbiance": "...", "emotionalTone": "..."}`,

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
}
