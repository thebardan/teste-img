import { contrastRatio } from '../utils/color-harmony'

export interface DesignQAInput {
  palette: {
    text: string
    textSecondary: string
    background: string
    dominant: string
    accent: string
  }
  typography: {
    scale: Record<string, number>
  }
  zones: Record<string, { x: number; y: number; width: number; height: number }>
  hasLogo: boolean
  minFontSize?: number
}

export interface DesignQACheck {
  rule: string
  category: 'contrast' | 'hierarchy' | 'spacing' | 'brand' | 'legibility' | 'balance'
  weight: number
  passed: boolean
  message: string
}

export interface DesignQAResult {
  score: number
  passed: boolean
  checks: DesignQACheck[]
  suggestions: string[]
}

export class DesignQA {
  static evaluate(input: DesignQAInput): DesignQAResult {
    const checks: DesignQACheck[] = [
      this.checkContrast(input),
      this.checkSecondaryContrast(input),
      this.checkHierarchy(input),
      this.checkOverlap(input),
      this.checkDensity(input),
      this.checkBrandPresence(input),
      this.checkMinFontSize(input),
    ]

    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
    const earnedWeight = checks.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0)
    const score = Math.round((earnedWeight / totalWeight) * 100)

    const suggestions = checks.filter((c) => !c.passed).map((c) => c.message)

    return { score, passed: score >= 70, checks, suggestions }
  }

  private static checkContrast(input: DesignQAInput): DesignQACheck {
    const ratio = contrastRatio(input.palette.text, input.palette.background)
    return {
      rule: 'contrast', category: 'contrast', weight: 25,
      passed: ratio >= 4.5,
      message: `Contraste texto/fundo: ${ratio.toFixed(1)}:1 (mínimo 4.5:1). ${ratio < 4.5 ? 'Ajuste a cor do texto ou adicione overlay no fundo.' : ''}`,
    }
  }

  private static checkSecondaryContrast(input: DesignQAInput): DesignQACheck {
    const ratio = contrastRatio(input.palette.textSecondary, input.palette.background)
    return {
      rule: 'secondary-contrast', category: 'contrast', weight: 10,
      passed: ratio >= 3,
      message: `Contraste texto secundário/fundo: ${ratio.toFixed(1)}:1 (mínimo 3:1).`,
    }
  }

  private static checkHierarchy(input: DesignQAInput): DesignQACheck {
    const s = input.typography.scale
    const ordered = s.hero > s.headline && s.headline > s.subtitle && s.subtitle > s.body && s.body > s.caption
    return {
      rule: 'hierarchy', category: 'hierarchy', weight: 20,
      passed: ordered,
      message: ordered ? 'Hierarquia tipográfica correta.' : 'Hierarquia invertida — recalcule a escala modular.',
    }
  }

  private static checkOverlap(input: DesignQAInput): DesignQACheck {
    const zoneEntries = Object.entries(input.zones)
    let hasOverlap = false
    for (let i = 0; i < zoneEntries.length; i++) {
      for (let j = i + 1; j < zoneEntries.length; j++) {
        const [, a] = zoneEntries[i]
        const [, b] = zoneEntries[j]
        if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
          hasOverlap = true; break
        }
      }
      if (hasOverlap) break
    }
    return {
      rule: 'overlap', category: 'spacing', weight: 15,
      passed: !hasOverlap,
      message: hasOverlap ? 'Zonas sobrepostas detectadas — ajuste o layout.' : 'Sem sobreposição de zonas.',
    }
  }

  private static checkDensity(input: DesignQAInput): DesignQACheck {
    const totalArea = Object.values(input.zones).reduce((sum, z) => sum + z.width * z.height, 0)
    const density = totalArea / (100 * 100)
    const ok = density >= 0.35 && density <= 0.80
    return {
      rule: 'density', category: 'balance', weight: 10,
      passed: ok,
      message: `Densidade visual: ${Math.round(density * 100)}% (ideal: 35-80%).`,
    }
  }

  private static checkBrandPresence(input: DesignQAInput): DesignQACheck {
    return {
      rule: 'brand', category: 'brand', weight: 10,
      passed: input.hasLogo && !!input.zones.logoZone,
      message: input.hasLogo ? 'Logo presente.' : 'Logo ausente — adicione via Brand Assets.',
    }
  }

  private static checkMinFontSize(input: DesignQAInput): DesignQACheck {
    const minSize = input.minFontSize ?? 8
    const tooSmall = Object.values(input.typography.scale).some((s) => s < minSize)
    return {
      rule: 'min-font', category: 'legibility', weight: 10,
      passed: !tooSmall,
      message: tooSmall ? `Fontes abaixo de ${minSize}pt detectadas.` : 'Tamanhos de fonte adequados.',
    }
  }
}
