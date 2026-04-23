import { Injectable } from '@nestjs/common'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'

export type QACheckLevel = 'ERROR' | 'WARNING' | 'INFO'

export interface QACheck {
  rule: string
  level: QACheckLevel
  message: string
  passed: boolean
  explanation?: string  // why this matters
  fixSuggestion?: string // how to fix
  targetField?: string  // which content field the check relates to
}

export interface AiFinding {
  field?: string          // headline, subtitle, benefits, cta, slide/N
  severity: QACheckLevel
  message: string
  fixSuggestion?: string
}

export interface QAResult {
  score: number          // 0–100
  passed: boolean        // score >= 70
  checks: QACheck[]
  aiFindings: AiFinding[]
  checkedAt: string
}

@Injectable()
export class QAAgent {
  constructor(private promptEngine: PromptEngineService) {}

  // ─── Sales Sheet QA ─────────────────────────────────────────────────────────

  async checkSalesSheet(content: Record<string, any>, productName: string): Promise<QAResult> {
    const checks: QACheck[] = [
      this.checkPresent('headline', content.headline, 'Headline ausente', 'ERROR', {
        explanation: 'Headline é o elemento de maior impacto — sem ele a lâmina não comunica nada.',
        fixSuggestion: 'Gere um headline com o Copy Director ou digite manualmente.',
      }),
      this.checkLength('headline', content.headline, 3, 10, 'Headline deve ter 3–10 palavras', {
        explanation: 'Headlines com 3-10 palavras são lidos em 1-2 segundos — crítico para materiais comerciais.',
      }),
      this.checkPresent('subtitle', content.subtitle, 'Subtítulo ausente', 'ERROR', {
        fixSuggestion: 'Subtítulo amplia o headline e apresenta o produto.',
      }),
      this.checkArrayCount('benefits', content.benefits, 3, 5, 'Benefícios devem ter 3–5 itens', {
        explanation: '3-5 benefícios é o sweet-spot de retenção — menos parece raso, mais vira ruído.',
      }),
      this.checkBenefitLength('benefits', content.benefits),
      this.checkPresent('cta', content.cta, 'CTA ausente — obrigatório', 'ERROR', {
        fixSuggestion: 'CTA direciona a próxima ação. Ex: "Compre agora", "Saiba mais".',
      }),
      this.checkCtaLength('cta', content.cta),
      this.checkPresent('qrUrl', content.qrUrl, 'QR URL ausente', 'WARNING', {
        fixSuggestion: 'Adicione URL para gerar QR code automaticamente.',
      }),
      this.checkUrlFormat('qrUrl', content.qrUrl),
      this.checkPresent('logoUrl', content.logoUrl, 'Logo não selecionado', 'WARNING', {
        fixSuggestion: 'Selecione logo no painel Brand Assets ou no picker da lâmina.',
      }),
    ]

    const aiFindings = await this.runAiCheckStructured(
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
      .map((s) => `[slide/${s.order}] [${s.content.type}] ${s.content.title ?? '—'}: ${(s.content.body ?? []).join('; ')}`)
      .join('\n')

    const aiFindings = await this.runAiCheckStructured(title, slidesSummary, 'presentation')

    return this.buildResult(checks, aiFindings)
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private checkPresent(
    rule: string,
    value: any,
    msg: string,
    level: QACheckLevel = 'ERROR',
    extras: Partial<Pick<QACheck, 'explanation' | 'fixSuggestion'>> = {},
  ): QACheck {
    const passed = !!value && String(value).trim().length > 0
    return { rule, level, message: msg, passed, targetField: rule, ...extras }
  }

  private checkLength(
    rule: string,
    text: string | undefined,
    min: number,
    max: number,
    msg: string,
    extras: Partial<Pick<QACheck, 'explanation' | 'fixSuggestion'>> = {},
  ): QACheck {
    const words = (text ?? '').split(/\s+/).filter(Boolean).length
    const passed = words >= min && words <= max
    return { rule, level: 'WARNING', message: `${msg} (${words} palavras)`, passed, targetField: rule, ...extras }
  }

  private checkArrayCount(
    rule: string,
    arr: any[] | undefined,
    min: number,
    max: number,
    msg: string,
    extras: Partial<Pick<QACheck, 'explanation' | 'fixSuggestion'>> = {},
  ): QACheck {
    const count = (arr ?? []).length
    const passed = count >= min && count <= max
    return { rule, level: 'ERROR', message: `${msg} (${count} encontrado(s))`, passed, targetField: rule, ...extras }
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

  private async runAiCheckStructured(
    subject: string,
    content: string,
    type: 'sales-sheet' | 'presentation',
  ): Promise<AiFinding[]> {
    try {
      const result = await this.promptEngine.run('qa-check', { subject, content, type })
      const parsed = result.parsedOutput as any

      // Support both legacy {issues: string[]} and new {findings: AiFinding[]}
      if (Array.isArray(parsed?.findings)) {
        return parsed.findings
          .filter((f: any) => typeof f?.message === 'string')
          .map((f: any): AiFinding => ({
            field: typeof f.field === 'string' ? f.field : undefined,
            severity: ['ERROR', 'WARNING', 'INFO'].includes(f.severity) ? f.severity : 'WARNING',
            message: f.message,
            fixSuggestion: typeof f.fixSuggestion === 'string' ? f.fixSuggestion : undefined,
          }))
      }
      if (Array.isArray(parsed?.issues)) {
        return parsed.issues
          .filter((msg: any) => typeof msg === 'string')
          .map((msg: string): AiFinding => ({ severity: 'WARNING', message: msg }))
      }
      return []
    } catch {
      return []
    }
  }

  private buildResult(checks: QACheck[], aiFindings: AiFinding[]): QAResult {
    const errors   = checks.filter((c) => !c.passed && c.level === 'ERROR').length
    const warnings = checks.filter((c) => !c.passed && c.level === 'WARNING').length
    const aiErrors = aiFindings.filter((f) => f.severity === 'ERROR').length
    const aiWarnings = aiFindings.filter((f) => f.severity === 'WARNING').length

    const score = Math.max(
      0,
      Math.round(100 - errors * 15 - warnings * 5 - aiErrors * 10 - aiWarnings * 3),
    )

    return {
      score,
      passed: score >= 70 && errors === 0 && aiErrors === 0,
      checks,
      aiFindings,
      checkedAt: new Date().toISOString(),
    }
  }
}
