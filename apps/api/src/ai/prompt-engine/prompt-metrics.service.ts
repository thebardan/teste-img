import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export interface PromptVersionStats {
  promptId: string
  promptVersion: string
  usage: number
  approvedCount: number
  rejectedCount: number
  draftCount: number
  archivedCount: number
  approvalRate: number
  avgDurationMs: number
  successRate: number
}

export interface PromptMetricsQuery {
  promptId?: string
  from?: Date
  to?: Date
  limit?: number
  offset?: number
}

@Injectable()
export class PromptMetricsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Aggregates InferenceLog stats by (promptId, promptVersion) using Prisma groupBy
   * (SQL GROUP BY). Relies on composite index (promptId, promptVersion).
   * Joins final status via a second query on the related version tables.
   */
  async getAll(query: PromptMetricsQuery = {}): Promise<{ items: PromptVersionStats[]; total: number }> {
    const where: any = {}
    if (query.promptId) where.promptId = query.promptId
    if (query.from || query.to) {
      where.createdAt = {}
      if (query.from) where.createdAt.gte = query.from
      if (query.to) where.createdAt.lte = query.to
    }

    const limit = Math.max(1, Math.min(100, query.limit ?? 50))
    const offset = Math.max(0, query.offset ?? 0)

    const grouped = await this.prisma.inferenceLog.groupBy({
      by: ['promptId', 'promptVersion'],
      where,
      _count: { _all: true },
      _avg: { durationMs: true },
      _sum: { durationMs: true },
      orderBy: { _count: { promptId: 'desc' } },
    })

    const totalCount = grouped.length
    const pagedGroups = grouped.slice(offset, offset + limit)

    const items = await Promise.all(
      pagedGroups.map(async (g) => {
        const [approvedSheet, rejectedSheet, draftSheet, archivedSheet,
               approvedPres, rejectedPres, draftPres, archivedPres,
               successCount] = await Promise.all([
          this.countByStatus(g.promptId, g.promptVersion, 'APPROVED', 'salesSheet', where),
          this.countByStatus(g.promptId, g.promptVersion, 'REJECTED', 'salesSheet', where),
          this.countByStatus(g.promptId, g.promptVersion, 'DRAFT', 'salesSheet', where),
          this.countByStatus(g.promptId, g.promptVersion, 'ARCHIVED', 'salesSheet', where),
          this.countByStatus(g.promptId, g.promptVersion, 'APPROVED', 'presentation', where),
          this.countByStatus(g.promptId, g.promptVersion, 'REJECTED', 'presentation', where),
          this.countByStatus(g.promptId, g.promptVersion, 'DRAFT', 'presentation', where),
          this.countByStatus(g.promptId, g.promptVersion, 'ARCHIVED', 'presentation', where),
          this.prisma.inferenceLog.count({
            where: { ...where, promptId: g.promptId, promptVersion: g.promptVersion, success: true },
          }),
        ])

        const approved = approvedSheet + approvedPres
        const rejected = rejectedSheet + rejectedPres
        const draft = draftSheet + draftPres
        const archived = archivedSheet + archivedPres
        const decided = approved + rejected
        const usage = g._count._all

        return {
          promptId: g.promptId,
          promptVersion: g.promptVersion,
          usage,
          approvedCount: approved,
          rejectedCount: rejected,
          draftCount: draft,
          archivedCount: archived,
          approvalRate: decided > 0 ? approved / decided : 0,
          avgDurationMs: Math.round(g._avg.durationMs ?? 0),
          successRate: usage > 0 ? successCount / usage : 0,
        }
      }),
    )

    return { items, total: totalCount }
  }

  async getForPrompt(promptId: string, query: Omit<PromptMetricsQuery, 'promptId'> = {}) {
    return this.getAll({ ...query, promptId })
  }

  private async countByStatus(
    promptId: string,
    promptVersion: string,
    status: 'APPROVED' | 'REJECTED' | 'DRAFT' | 'ARCHIVED',
    entity: 'salesSheet' | 'presentation',
    baseWhere: any,
  ): Promise<number> {
    const relation = entity === 'salesSheet'
      ? { salesSheetVersion: { salesSheet: { status } } }
      : { presentationVersion: { presentation: { status } } }
    return this.prisma.inferenceLog.count({
      where: { ...baseWhere, promptId, promptVersion, ...relation },
    })
  }
}
