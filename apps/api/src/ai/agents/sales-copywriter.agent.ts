import { Injectable } from '@nestjs/common'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'

export interface SalesCopyInput {
  productName: string
  sku: string
  category: string
  description: string
  benefits: string[]
  specs: string
  channel?: string
}

export interface SalesCopyOutput {
  headline: string
  subtitle: string
  benefits: string[]
  cta: string
}

@Injectable()
export class SalesCopywriterAgent {
  constructor(private promptEngine: PromptEngineService) {}

  async generate(input: SalesCopyInput, opts?: { salesSheetVersionId?: string }): Promise<SalesCopyOutput> {
    const result = await this.promptEngine.run('sales-sheet-copy', {
      productName: input.productName,
      sku: input.sku,
      category: input.category,
      description: input.description,
      benefits: input.benefits.join(', '),
      specs: input.specs,
      channel: input.channel ?? 'Varejo',
    }, opts)

    const output = result.parsedOutput as any
    return {
      headline: output?.headline ?? `${input.productName} — Qualidade Multilaser`,
      subtitle: output?.subtitle ?? input.description.slice(0, 80),
      benefits: output?.benefits ?? input.benefits.slice(0, 4),
      cta: output?.cta ?? 'Saiba mais',
    }
  }
}
