import { Injectable } from '@nestjs/common'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'

export interface VisualDirectionInput {
  productName: string
  category: string
  headline: string
}

export interface VisualDirectionOutput {
  style: string
  colors: string[]
  imageAmbiance: string
  emotionalTone: string
  suggestedBackground: 'DARK' | 'LIGHT' | 'COLORED'
}

@Injectable()
export class VisualDirectorAgent {
  constructor(private promptEngine: PromptEngineService) {}

  async direct(input: VisualDirectionInput): Promise<VisualDirectionOutput> {
    const result = await this.promptEngine.run('visual-direction', {
      productName: input.productName,
      category: input.category,
      headline: input.headline,
    })

    const output = result.parsedOutput as any
    const colors: string[] = output?.colors ?? ['#1a1a2e', '#e94560']

    // Infer background from dominant color brightness
    const dominantHex = colors[0] ?? '#1a1a2e'
    const r = parseInt(dominantHex.slice(1, 3), 16)
    const g = parseInt(dominantHex.slice(3, 5), 16)
    const b = parseInt(dominantHex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    const suggestedBackground: 'DARK' | 'LIGHT' | 'COLORED' =
      brightness < 80 ? 'DARK' : brightness > 180 ? 'LIGHT' : 'COLORED'

    return {
      style: output?.style ?? 'clean tech',
      colors,
      imageAmbiance: output?.imageAmbiance ?? `${input.productName} em fundo neutro com iluminação estúdio`,
      emotionalTone: output?.emotionalTone ?? 'moderno e confiante',
      suggestedBackground,
    }
  }
}
