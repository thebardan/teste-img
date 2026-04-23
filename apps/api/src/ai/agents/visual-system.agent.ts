import { Injectable } from '@nestjs/common'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'
import { buildPalette, hexToHsl } from '../utils/color-harmony'
import { generateTypeScale, getFontPairing, SCALE_RATIOS } from '../utils/type-scale'
import { CacheService } from '../../cache/cache.service'

const VISUAL_SYSTEM_CACHE_TTL_SECONDS = 60 * 60
const VISUAL_SYSTEM_CACHE_PREFIX = 'ai:visual-system:'

export interface VisualSystemInput {
  productName: string
  category: string
  headline?: string
  emotionalTone?: string
  channel?: string
}

export interface VisualSystem {
  palette: {
    dominant: string
    accent: string
    neutral: string
    background: string
    backgroundSecondary: string
    text: string
    textSecondary: string
  }
  typography: {
    displayFont: string
    bodyFont: string
    scale: Record<'hero' | 'headline' | 'subtitle' | 'body' | 'caption' | 'micro', number>
    ratio: number
  }
  background: {
    type: 'solid' | 'gradient-linear' | 'gradient-radial' | 'mesh'
    colors: string[]
    angle: number
    overlay: { color: string; opacity: number }
    texture: 'none' | 'noise' | 'grid' | 'dots'
  }
  mood: {
    style: string
    emotionalTone: string
    darkMode: boolean
  }
}

@Injectable()
export class VisualSystemAgent {
  constructor(
    private promptEngine: PromptEngineService,
    private cache: CacheService,
  ) {}

  async generate(input: VisualSystemInput & { bypassCache?: boolean }): Promise<VisualSystem> {
    const cacheable = !input.bypassCache
    const cacheKey = cacheable
      ? `${VISUAL_SYSTEM_CACHE_PREFIX}${CacheService.hashInput({
          productName: input.productName,
          category: input.category,
          headline: input.headline ?? '',
          emotionalTone: input.emotionalTone ?? '',
          channel: input.channel ?? '',
        })}`
      : null

    if (cacheKey) {
      const cached = await this.cache.get<VisualSystem>(cacheKey)
      if (cached) return cached
    }

    // 1. Call AI for creative direction
    const result = await this.promptEngine.run('visual-system', {
      productName: input.productName,
      category: input.category,
      headline: input.headline ?? '',
    })

    const ai = result.parsedOutput as any

    // 2. Extract baseHue from AI's dominantColor
    const rawHex: string = this.sanitizeHex(ai?.dominantColor) ?? '#0066ff'
    const { h: baseHue } = hexToHsl(rawHex)

    // 3. Resolve color scheme and dark mode from AI response
    const darkMode: boolean = ai?.darkMode === true || ai?.darkMode === 'true'
    const colorScheme: 'complementary' | 'analogous' | 'triadic' =
      this.resolveScheme(ai?.colorScheme)

    // 4. Build palette algorithmically
    const palette = buildPalette(baseHue, colorScheme, darkMode)

    // 5. Determine category-based scale ratio
    const ratio = this.selectRatio(input.category)

    // 6. Build typography
    const pairing = getFontPairing(input.category)
    const scale = generateTypeScale(16, ratio)

    // 7. Build background from AI suggestions + palette
    const bgType: VisualSystem['background']['type'] =
      this.resolveBackgroundType(ai?.backgroundType)
    const gradientAngle: number =
      typeof ai?.gradientAngle === 'number'
        ? Math.max(0, Math.min(360, ai.gradientAngle))
        : 135
    const texture: VisualSystem['background']['texture'] =
      this.resolveTexture(ai?.texture)

    // Background colors: dominant + accent for gradients, just background for solid
    const bgColors: string[] =
      bgType === 'solid'
        ? [palette.background]
        : [palette.dominant, palette.accent, palette.backgroundSecondary]

    const overlayColor = darkMode ? '#000000' : '#ffffff'
    const overlayOpacity = darkMode ? 0.3 : 0.15

    const out: VisualSystem = {
      palette,
      typography: {
        displayFont: pairing.display,
        bodyFont: pairing.body,
        scale,
        ratio,
      },
      background: {
        type: bgType,
        colors: bgColors,
        angle: gradientAngle,
        overlay: { color: overlayColor, opacity: overlayOpacity },
        texture,
      },
      mood: {
        style: typeof ai?.style === 'string' ? ai.style : 'contemporâneo',
        emotionalTone: typeof ai?.emotionalTone === 'string' ? ai.emotionalTone : 'inovação acessível',
        darkMode,
      },
    }

    if (cacheKey) {
      await this.cache.set(cacheKey, out, VISUAL_SYSTEM_CACHE_TTL_SECONDS)
    }

    return out
  }

  // ─── private helpers ───────────────────────────────────────────────────────

  private sanitizeHex(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const match = value.match(/#?[0-9a-fA-F]{6}/)
    if (!match) return null
    const hex = match[0]
    return hex.startsWith('#') ? hex : `#${hex}`
  }

  private resolveScheme(value: unknown): 'complementary' | 'analogous' | 'triadic' {
    if (value === 'complementary' || value === 'analogous' || value === 'triadic') return value
    return 'analogous'
  }

  private resolveBackgroundType(value: unknown): VisualSystem['background']['type'] {
    if (
      value === 'solid' ||
      value === 'gradient-linear' ||
      value === 'gradient-radial' ||
      value === 'mesh'
    )
      return value
    return 'gradient-linear'
  }

  private resolveTexture(value: unknown): VisualSystem['background']['texture'] {
    if (value === 'none' || value === 'noise' || value === 'grid' || value === 'dots') return value
    return 'none'
  }

  private selectRatio(category: string): number {
    const cat = category.toLowerCase()

    if (
      cat.includes('gamer') ||
      cat.includes('gaming') ||
      cat.includes('periféric') ||
      cat.includes('mouse') ||
      cat.includes('teclado')
    )
      return SCALE_RATIOS.perfectFourth

    if (cat.includes('premium') || cat.includes('smartphone') || cat.includes('celular'))
      return SCALE_RATIOS.majorThird

    if (cat.includes('industrial') || cat.includes('ferramenta') || cat.includes('tool'))
      return SCALE_RATIOS.majorSecond

    return SCALE_RATIOS.minorThird
  }
}
