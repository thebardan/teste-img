import { Injectable, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../config/env'

export interface MatchResult {
  productId: string
  productName: string
  score: number
}

@Injectable()
export class VectorMatchService {
  private readonly logger = new Logger(VectorMatchService.name)
  private readonly threshold: number

  constructor(
    private prisma: PrismaClient,
    private config: ConfigService<Env>,
  ) {
    this.threshold = this.config.get('DRIVE_SYNC_MATCH_THRESHOLD') ?? 0.75
  }

  async storeProductEmbedding(productId: string, embedding: number[]): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`
    await this.prisma.$executeRawUnsafe(
      `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      productId,
    )
  }

  async storeFolderEmbedding(folderId: string, embedding: number[]): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`
    await this.prisma.$executeRawUnsafe(
      `UPDATE "DriveFolder" SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      folderId,
    )
  }

  async findBestMatch(folderEmbedding: number[]): Promise<MatchResult | null> {
    const vectorStr = `[${folderEmbedding.join(',')}]`

    const results = await this.prisma.$queryRawUnsafe<
      { id: string; name: string; score: number }[]
    >(
      `SELECT id, name, 1 - (embedding <=> $1::vector) AS score
       FROM "Product"
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      vectorStr,
    )

    if (results.length === 0) return null

    const best = results[0]
    return { productId: best.id, productName: best.name, score: best.score }
  }

  getThreshold(): number {
    return this.threshold
  }
}
