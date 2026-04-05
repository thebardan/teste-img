import { Injectable } from '@nestjs/common'
import { BrandAssetsService } from '../../brand-assets/brand-assets.service'

export interface BrandGuardianInput {
  background: 'DARK' | 'LIGHT' | 'COLORED' | 'ANY'
  templateType?: string
}

export interface BrandGuardianOutput {
  logoAssetId: string
  logoUrl: string
  logoFormat: string
  selectionScore: number
  reason: string
}

@Injectable()
export class BrandGuardianAgent {
  constructor(private brandAssetsService: BrandAssetsService) {}

  async selectLogo(input: BrandGuardianInput): Promise<BrandGuardianOutput> {
    const asset = await this.brandAssetsService.selectBest(input.background)

    if (!asset) {
      throw new Error('No active brand assets found')
    }

    const rule = asset.rules.find((r) => r.condition.includes(`'${input.background}'`))
      ?? asset.rules[0]

    return {
      logoAssetId: asset.id,
      logoUrl: asset.url,
      logoFormat: asset.format,
      selectionScore: rule?.score ?? 70,
      reason: rule?.notes ?? `Best for ${input.background} backgrounds`,
    }
  }
}
