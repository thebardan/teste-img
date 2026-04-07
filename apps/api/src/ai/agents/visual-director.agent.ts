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

    // Fallback palette by category if AI didn't return colors
    const fallbackPalette = this.getFallbackPalette(input.category)
    const colors: string[] = output?.colors?.length >= 2 ? output.colors : fallbackPalette

    // Infer background from dominant color brightness
    const dominantHex = colors[0] ?? '#0a0a0f'
    const r = parseInt(dominantHex.slice(1, 3), 16)
    const g = parseInt(dominantHex.slice(3, 5), 16)
    const b = parseInt(dominantHex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    const suggestedBackground: 'DARK' | 'LIGHT' | 'COLORED' =
      brightness < 80 ? 'DARK' : brightness > 180 ? 'LIGHT' : 'COLORED'

    return {
      style: output?.style ?? 'neon tech',
      colors,
      imageAmbiance: output?.imageAmbiance ?? `${input.productName} em cenário futurista com iluminação neon e reflexos`,
      emotionalTone: output?.emotionalTone ?? 'inovação acessível',
      suggestedBackground,
    }
  }

  private getFallbackPalette(category: string): string[] {
    const cat = category.toLowerCase()

    if (cat.includes('gamer') || cat.includes('gaming') || cat.includes('periféric') || cat.includes('mouse') || cat.includes('teclado'))
      return ['#0a0a0f', '#00f5ff', '#ff00c8']

    if (cat.includes('áudio') || cat.includes('fone') || cat.includes('headphone') || cat.includes('speaker'))
      return ['#0d0d1a', '#7b2ff7', '#00ff88']

    if (cat.includes('smartphone') || cat.includes('celular') || cat.includes('phone'))
      return ['#0a0a14', '#0091ff', '#ff2d78']

    if (cat.includes('notebook') || cat.includes('tablet') || cat.includes('computador'))
      return ['#f8f8fa', '#0066ff', '#e8e8ec']

    if (cat.includes('câmera') || cat.includes('segurança') || cat.includes('smart home'))
      return ['#0f0f1a', '#667eea', '#764ba2']

    if (cat.includes('fitness') || cat.includes('esporte') || cat.includes('smartwatch'))
      return ['#0a0a0f', '#c5f82a', '#0055ff']

    if (cat.includes('ferramenta') || cat.includes('tool'))
      return ['#111111', '#ffbe0b', '#ff6b00']

    if (cat.includes('cozinha') || cat.includes('eletrodoméstico') || cat.includes('eletroportát'))
      return ['#faf5f0', '#d4a574', '#4a7c59']

    // Default: neon tech
    return ['#0a0a0f', '#00f5ff', '#c850ff']
  }
}
