import { Injectable } from '@nestjs/common'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'

export type QACheckLevel = 'ERROR' | 'WARNING' | 'INFO'

export interface QACheck {
  rule: string
  level: QACheckLevel
  message: string
  passed: boolean
}

export interface QAResult {
  score: number          // 0–100
  passed: boolean        // score >= 70
  checks: QACheck[]
  aiFindings: string[]   // from LLM
  checkedAt: string
}

@Injectable()
export class QAAgent {
  constructor(private promptEngine: PromptEngineService) {}

  // ─── Sales Sheet QA ─────────────────────────────────────────────────────────

  async checkSalesSheet(content: Record<string, any>, productName: string): Promise<QAResult> {
    const checks: QACheck[] = [
      this.checkPresent('headline', content.headline, 'Headline ausente'),
      this.checkLength('headline', content.headline, 3, 10, 'Headline deve ter 3–10 palavras'),
      this.checkPresent('subtitle', content.subtitle, 'Subtítulo ausente'),
      this.checkArrayCount('benefits', content.benefits, 3, 5, 'Benefícios devem ter 3–5 itens'),
      this.checkBenefitLength('benefits', content.benefits),
      this.checkPresent('cta', content.cta, 'CTA ausente — obrigatório'),
      this.checkCtaLength('cta', content.cta),
      this.checkPresent('qrUrl', content.qrUrl, 'QR URL ausente', 'WARNING'),
      this.checkUrlFormat('qrUrl', content.qrUrl),
      this.checkPresent('logoUrl', content.logoUrl, 'Logo não selecionado', 'WARNING'),
    ]

    const aiFindings = await this.runAiCheck(
      productName,
      `Headline: ${content.headline ?? '—'}\nSubtítulo: ${content.subtitle ?? '—'}\nBenefícios: ${(content.benefits ?? []).join(', ')}\nCTA: ${content.cta ?? '—'}`,
      'sales-sheet',
    )

    return this.buildResult(checks, aiFindings)
  }

  // ─── Presentation QA ────────────────────────────────────────────────────────

  async checkPresentation(slides: { order: number; content: Record<string, any> }[], title: string): Promise<QAResult> {
    const checks: QACheck[] = [
      this.checkPresent('title', title, 'Título da apresentação ausente'),
      {
        rule: 'slide-count',
        level: 'ERROR',
        message: `Apresentação deve ter 5 slides (tem ${slides.length})`,
        passed: slides.length === 5,
      },
      this.checkSlideTypes(slides),
      this.checkClosingCta(slides),
      this.checkCoverTitle(slides),
      this.checkBodyContent(slides),
    ]

    const slidesSummary = slides
      .sort((a, b) => a.order - b.order)
      .map((s) => `[${s.content.type}] ${s.content.title ?? '—'}: ${(s.content.body ?? []).join('; ')}`)
      .join('\n')

    const aiFindings = await this.runAiCheck(title, slidesSummary, 'presentation')

    return this.buildResult(checks, aiFindings)
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private checkPresent(rule: string, value: any, msg: string, level: QACheckLevel = 'ERROR'): QACheck {
    const passed = !!value && String(value).trim().length > 0
    return { rule, level, message: msg, passed }
  }

  private checkLength(rule: string, text: string | undefined, min: number, max: number, msg: string): QACheck {
    const words = (text ?? '').split(/\s+/).filter(Boolean).length
    const passed = words >= min && words <= max
    return { rule, level: 'WARNING', message: `${msg} (${words} palavras)`, passed }
  }

  private checkArrayCount(rule: string, arr: any[] | undefined, min: number, max: number, msg: string): QACheck {
    const count = (arr ?? []).length
    const passed = count >= min && count <= max
    return { rule, level: 'ERROR', message: `${msg} (${count} encontrado(s))`, passed }
  }

  private checkBenefitLength(rule: string, benefits: string[] | undefined): QACheck {
    const long = (benefits ?? []).filter((b) => b.split(/\s+/).length > 10)
    return {
      rule,
      level: 'WARNING',
      message: long.length > 0 ? `${long.length} benefício(s) com excesso de texto` : 'Benefícios com comprimento adequado',
      passed: long.length === 0,
    }
  }

  private checkCtaLength(rule: string, cta: string | undefined): QACheck {
    const words = (cta ?? '').split(/\s+/).filter(Boolean).length
    return {
      rule,
      level: 'WARNING',
      message: `CTA deve ter até 6 palavras (${words} palavras)`,
      passed: words <= 6,
    }
  }

  private checkUrlFormat(rule: string, url: string | undefined): QACheck {
    const valid = !url || url.startsWith('http://') || url.startsWith('https://')
    return { rule, level: 'WARNING', message: 'QR URL deve começar com http(s)://', passed: valid }
  }

  private checkSlideTypes(slides: { content: Record<string, any> }[]): QACheck {
    const types = slides.map((s) => s.content.type)
    const required = ['cover', 'context', 'products', 'benefits', 'closing']
    const missing = required.filter((t) => !types.includes(t))
    return {
      rule: 'slide-types',
      level: 'ERROR',
      message: missing.length ? `Tipos de slide faltando: ${missing.join(', ')}` : 'Todos os tipos de slide presentes',
      passed: missing.length === 0,
    }
  }

  private checkClosingCta(slides: { content: Record<string, any> }[]): QACheck {
    const closing = slides.find((s) => s.content.type === 'closing')
    const hasCta = !!closing?.content?.cta
    return { rule: 'closing-cta', level: 'WARNING', message: 'Slide de fechamento deve ter CTA', passed: hasCta }
  }

  private checkCoverTitle(slides: { content: Record<string, any> }[]): QACheck {
    const cover = slides.find((s) => s.content.type === 'cover')
    const hasTitle = !!cover?.content?.title?.trim()
    return { rule: 'cover-title', level: 'ERROR', message: 'Slide de capa deve ter título', passed: hasTitle }
  }

  private checkBodyContent(slides: { content: Record<string, any> }[]): QACheck {
    const empty = slides.filter((s) => !s.content.body?.length && s.content.type !== 'cover')
    return {
      rule: 'slide-body',
      level: 'WARNING',
      message: empty.length ? `${empty.length} slide(s) sem corpo de conteúdo` : 'Todos os slides com conteúdo',
      passed: empty.length === 0,
    }
  }

  private async runAiCheck(subject: string, content: string, type: 'sales-sheet' | 'presentation'): Promise<string[]> {
    try {
      const result = await this.promptEngine.run('qa-check', { subject, content, type })
      const parsed = result.parsedOutput as any
      return Array.isArray(parsed?.issues) ? parsed.issues : []
    } catch {
      return []
    }
  }

  private buildResult(checks: QACheck[], aiFindings: string[]): QAResult {
    const errors   = checks.filter((c) => !c.passed && c.level === 'ERROR').length
    const warnings = checks.filter((c) => !c.passed && c.level === 'WARNING').length
    const total    = checks.length

    // Score: start at 100, subtract per failed check weighted by level
    const score = Math.max(0, Math.round(100 - errors * 15 - warnings * 5 - aiFindings.length * 3))

    return {
      score,
      passed: score >= 70 && errors === 0,
      checks,
      aiFindings,
      checkedAt: new Date().toISOString(),
    }
  }
}
