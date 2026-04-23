import { Injectable, Logger } from '@nestjs/common'
import { GeminiVisionProvider } from '../providers/gemini/gemini-vision.provider'
import { StorageService } from '../../storage/storage.service'

export interface ImageQAFinding {
  severity: 'ERROR' | 'WARNING' | 'INFO'
  category: 'composition' | 'brand' | 'legibility' | 'fidelity'
  message: string
  fixSuggestion?: string
}

export interface ImageQAResult {
  score: number           // 0-100
  passed: boolean         // score >= 70, no errors
  findings: ImageQAFinding[]
  rawResponse: string
  checkedAt: string
}

@Injectable()
export class ImageQAService {
  private readonly logger = new Logger(ImageQAService.name)

  constructor(
    private vision: GeminiVisionProvider,
    private storage: StorageService,
  ) {}

  async evaluate(storageKey: string, ctx: {
    productName: string
    category: string
    headline?: string
    expectedColors?: string[]
    hasLogo?: boolean
  }): Promise<ImageQAResult> {
    const buffer = await this.storage.getBuffer(storageKey)
    const base64 = buffer.toString('base64')
    const mime = storageKey.endsWith('.png') ? 'image/png' : 'image/jpeg'

    const prompt = `Você é um QA de materiais comerciais premium. Analise a imagem abaixo (lâmina de vendas final) para o produto "${ctx.productName}" (${ctx.category}).

Verifique sistematicamente:
1. COMPOSITION: produto centralizado na zona da imagem? textos legíveis (sem corte)? balanço visual?
2. BRAND: ${ctx.hasLogo ? 'logo presente, legível, não distorcido?' : 'marca da empresa aparece?'}
3. LEGIBILITY: todos os textos (headline, benefícios, CTA) legíveis contra o fundo? contraste suficiente?
4. FIDELITY: produto representado corretamente (cor, forma, detalhes)? sem artefatos de geração IA?
${ctx.headline ? `5. TEXT MATCH: headline visível contém "${ctx.headline}"?` : ''}
${ctx.expectedColors?.length ? `6. COLOR: paleta usada bate com ${ctx.expectedColors.join(', ')}?` : ''}

Responda APENAS com JSON:
{
  "score": 0-100,
  "findings": [
    {
      "severity": "ERROR"|"WARNING"|"INFO",
      "category": "composition"|"brand"|"legibility"|"fidelity",
      "message": "descrição específica do problema",
      "fixSuggestion": "como corrigir (opcional)"
    }
  ]
}`

    let rawResponse = ''
    try {
      rawResponse = await this.vision.analyze({ prompt, imageBase64: base64, mimeType: mime })
    } catch (err: any) {
      this.logger.warn(`Vision API failed: ${err?.message}`)
      return {
        score: 0,
        passed: false,
        findings: [
          { severity: 'ERROR', category: 'composition', message: `Vision API falhou: ${err?.message ?? 'unknown'}` },
        ],
        rawResponse: '',
        checkedAt: new Date().toISOString(),
      }
    }

    const parsed = this.parseResponse(rawResponse)
    const errors = parsed.findings.filter((f) => f.severity === 'ERROR').length
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(100, parsed.score)) : 70

    return {
      score,
      passed: score >= 70 && errors === 0,
      findings: parsed.findings,
      rawResponse,
      checkedAt: new Date().toISOString(),
    }
  }

  private parseResponse(raw: string): { score?: number; findings: ImageQAFinding[] } {
    try {
      const match = raw.match(/```json\s*([\s\S]*?)\s*```/) ?? raw.match(/(\{[\s\S]*\})/)
      if (!match) return { findings: [] }
      const parsed = JSON.parse(match[1] ?? match[0])
      const findings: ImageQAFinding[] = Array.isArray(parsed?.findings)
        ? parsed.findings
            .filter((f: any) => typeof f?.message === 'string')
            .map((f: any) => ({
              severity: ['ERROR', 'WARNING', 'INFO'].includes(f.severity) ? f.severity : 'WARNING',
              category: ['composition', 'brand', 'legibility', 'fidelity'].includes(f.category)
                ? f.category
                : 'composition',
              message: f.message,
              fixSuggestion: typeof f.fixSuggestion === 'string' ? f.fixSuggestion : undefined,
            }))
        : []
      return { score: parsed?.score, findings }
    } catch {
      return { findings: [] }
    }
  }
}
