import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class BrandAssetsService {
  constructor(private prisma: PrismaClient) {}

  async findAll() {
    return this.prisma.brandAsset.findMany({
      where: { isActive: true },
      include: { rules: { orderBy: { score: 'desc' } } },
      orderBy: { name: 'asc' },
    })
  }

  async findOne(id: string) {
    const asset = await this.prisma.brandAsset.findUnique({
      where: { id },
      include: { rules: { orderBy: { score: 'desc' } } },
    })
    if (!asset) throw new NotFoundException(`Brand asset ${id} not found`)
    return asset
  }

  async selectBest(background: 'DARK' | 'LIGHT' | 'COLORED' | 'ANY') {
    // Find all active logos and select the one with highest score for the given background
    const assets = await this.prisma.brandAsset.findMany({
      where: { isActive: true, type: 'LOGO' },
      include: { rules: true },
    })

    let best: (typeof assets)[0] | null = null
    let bestScore = -1

    for (const asset of assets) {
      // exact match rule
      const exactRule = asset.rules.find((r) => r.condition.includes(`'${background}'`))
      const anyRule = asset.rules.find((r) => r.condition.includes("'ANY'"))
      const score = exactRule?.score ?? anyRule?.score ?? (asset.bestOn === background ? 80 : 0)
      if (score > bestScore) {
        bestScore = score
        best = asset
      }
    }

    return best
  }
}
