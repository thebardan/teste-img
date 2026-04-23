import { Injectable } from '@nestjs/common'
import { BrandAssetsService } from '../../brand-assets/brand-assets.service'

export interface BrandGuardianInput {
  background: 'DARK' | 'LIGHT' | 'COLORED' | 'ANY'
  templateType?: string
  zoneWidth?: number  // in layout units (% of sheet)
  zoneHeight?: number
}

export interface BrandGuardianOutput {
  logoAssetId: string
  logoUrl: string
  logoFormat: string
  selectionScore: number
  reason: string
  rules: {
    minSize: { widthPct: number; heightPct: number }
    clearspace: { allSides: number }  // units in % of logo shorter side
    forbiddenBackgrounds: string[]
    maxLogoAreaPct: number  // logo should not exceed N% of canvas area
  }
  violations: string[]
}

@Injectable()
export class BrandGuardianAgent {
  constructor(private brandAssetsService: BrandAssetsService) {}

  async selectLogo(input: BrandGuardianInput): Promise<BrandGuardianOutput> {
    const asset = await this.brandAssetsService.selectBest(input.background)
    if (!asset) throw new Error('No active brand assets found')

    const rule = asset.rules.find((r) => r.condition.includes(`'${input.background}'`))
      ?? asset.rules[0]

    const rules = {
      minSize: { widthPct: 8, heightPct: 4 }, // 8% of width, 4% of height minimum
      clearspace: { allSides: 25 }, // 25% of logo shorter side
      forbiddenBackgrounds: [
        'busy-photographic-background',
        'low-contrast-panels',
        'human-face-overlay',
      ],
      maxLogoAreaPct: 12, // logo must not exceed 12% of canvas area
    }

    const violations: string[] = []
    if (input.zoneWidth != null && input.zoneWidth < rules.minSize.widthPct) {
      violations.push(`Logo width ${input.zoneWidth}% below minimum ${rules.minSize.widthPct}%`)
    }
    if (input.zoneHeight != null && input.zoneHeight < rules.minSize.heightPct) {
      violations.push(`Logo height ${input.zoneHeight}% below minimum ${rules.minSize.heightPct}%`)
    }
    if (input.zoneWidth != null && input.zoneHeight != null) {
      const area = input.zoneWidth * input.zoneHeight
      if (area > rules.maxLogoAreaPct * 100) {
        violations.push(`Logo area ${(area / 100).toFixed(1)}% exceeds max ${rules.maxLogoAreaPct}%`)
      }
    }

    return {
      logoAssetId: asset.id,
      logoUrl: asset.url,
      logoFormat: asset.format,
      selectionScore: rule?.score ?? 70,
      reason: rule?.notes ?? `Best for ${input.background} backgrounds`,
      rules,
      violations,
    }
  }
}
