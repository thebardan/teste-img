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
  approvalRate: number  // approved / (approved + rejected), null-safe
  avgDurationMs: number
  successRate: number   // non-error inference rate
}

@Injectable()
export class PromptMetricsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * For each (promptId, promptVersion) pair, compute usage stats and approval rate
   * based on the final status of the parent SalesSheet / Presentation.
   */
  async getAll(): Promise<PromptVersionStats[]> {
    const logs = await this.prisma.inferenceLog.findMany({
      select: {
        promptId: true,
        promptVersion: true,
        durationMs: true,
        success: true,
        salesSheetVersion: { select: { salesSheet: { select: { status: true } } } },
        presentationVersion: { select: { presentation: { select: { status: true } } } },
      },
    })

    const bucket = new Map<string, {
      promptId: string
      promptVersion: string
      usage: number
      successes: number
      totalDuration: number
      statuses: Record<string, number>
    }>()

    for (const log of logs) {
      const key = `${log.promptId}|${log.promptVersion}`
      if (!bucket.has(key)) {
        bucket.set(key, {
          promptId: log.promptId,
          promptVersion: log.promptVersion,
          usage: 0,
          successes: 0,
          totalDuration: 0,
          statuses: {},
        })
      }
      const b = bucket.get(key)!
      b.usage++
      if (log.success) b.successes++
      b.totalDuration += log.durationMs ?? 0
      const status = log.salesSheetVersion?.salesSheet.status ?? log.presentationVersion?.presentation.status
      if (status) b.statuses[status] = (b.statuses[status] ?? 0) + 1
    }

    const rows: PromptVersionStats[] = []
    for (const b of bucket.values()) {
      const approved = b.statuses['APPROVED'] ?? 0
      const rejected = b.statuses['REJECTED'] ?? 0
      const draft = b.statuses['DRAFT'] ?? 0
      const archived = b.statuses['ARCHIVED'] ?? 0
      const decided = approved + rejected
      rows.push({
        promptId: b.promptId,
        promptVersion: b.promptVersion,
        usage: b.usage,
        approvedCount: approved,
        rejectedCount: rejected,
        draftCount: draft,
        archivedCount: archived,
        approvalRate: decided > 0 ? approved / decided : 0,
        avgDurationMs: b.usage > 0 ? Math.round(b.totalDuration / b.usage) : 0,
        successRate: b.usage > 0 ? b.successes / b.usage : 0,
      })
    }

    return rows.sort((a, b) => b.usage - a.usage)
  }

  async getForPrompt(promptId: string): Promise<PromptVersionStats[]> {
    const all = await this.getAll()
    return all.filter((r) => r.promptId === promptId)
  }
}
