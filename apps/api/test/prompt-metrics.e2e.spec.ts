import * as request from 'supertest'
import { PromptMetricsController } from '../src/ai/prompt-engine/prompt-metrics.controller'
import { PromptMetricsService } from '../src/ai/prompt-engine/prompt-metrics.service'
import { bootstrap, close, makePrismaMock, type E2EContext } from './e2e-setup'

describe('E2E /api/prompt-metrics', () => {
  let ctx: E2EContext

  beforeEach(async () => {
    const prisma = makePrismaMock()
    ctx = await bootstrap({
      controllers: [PromptMetricsController],
      providers: [PromptMetricsService],
      prisma,
    })
  })

  afterEach(async () => { await close(ctx) })

  it('GET / aggregates by (promptId, promptVersion) via groupBy', async () => {
    ctx.prisma.inferenceLog.groupBy = jest.fn().mockResolvedValue([
      { promptId: 'copy-director', promptVersion: '1.0.0', _count: { _all: 3 }, _avg: { durationMs: 600 }, _sum: { durationMs: 1800 } },
      { promptId: 'copy-director', promptVersion: '2.0.0', _count: { _all: 1 }, _avg: { durationMs: 300 }, _sum: { durationMs: 300 } },
    ])
    // status counts: per (promptId, promptVersion, status, entity)
    ctx.prisma.inferenceLog.count.mockImplementation((args: any) => {
      const { promptId, promptVersion, salesSheetVersion, presentationVersion, success } = args.where
      if (success === true) {
        if (promptVersion === '1.0.0') return Promise.resolve(3)
        if (promptVersion === '2.0.0') return Promise.resolve(1)
      }
      if (salesSheetVersion?.salesSheet?.status === 'APPROVED') {
        if (promptVersion === '1.0.0') return Promise.resolve(2)
        if (promptVersion === '2.0.0') return Promise.resolve(1)
      }
      if (salesSheetVersion?.salesSheet?.status === 'REJECTED' && promptVersion === '1.0.0') return Promise.resolve(1)
      return Promise.resolve(0)
    })

    const res = await request(ctx.app.getHttpServer())
      .get('/api/prompt-metrics')
      .expect(200)

    expect(res.body.items).toHaveLength(2)
    expect(res.body.total).toBe(2)
    const v1 = res.body.items.find((r: any) => r.promptVersion === '1.0.0')
    expect(v1.usage).toBe(3)
    expect(v1.approvedCount).toBe(2)
    expect(v1.rejectedCount).toBe(1)
    expect(v1.approvalRate).toBeCloseTo(2 / 3, 2)
  })

  it('GET /:promptId filters to specific prompt', async () => {
    ctx.prisma.inferenceLog.groupBy = jest.fn().mockResolvedValue([
      { promptId: 'qa-check', promptVersion: '1.0.0', _count: { _all: 1 }, _avg: { durationMs: 100 }, _sum: { durationMs: 100 } },
    ])
    ctx.prisma.inferenceLog.count.mockResolvedValue(0)
    const res = await request(ctx.app.getHttpServer())
      .get('/api/prompt-metrics/qa-check')
      .expect(200)
    expect(res.body.items).toHaveLength(1)
    expect(res.body.items[0].promptId).toBe('qa-check')
  })

  it('respects limit + offset', async () => {
    ctx.prisma.inferenceLog.groupBy = jest.fn().mockResolvedValue(
      Array.from({ length: 10 }).map((_, i) => ({
        promptId: 'x',
        promptVersion: `v${i}`,
        _count: { _all: 1 },
        _avg: { durationMs: 100 },
        _sum: { durationMs: 100 },
      })),
    )
    ctx.prisma.inferenceLog.count.mockResolvedValue(0)
    const res = await request(ctx.app.getHttpServer())
      .get('/api/prompt-metrics?limit=3&offset=2')
      .expect(200)
    expect(res.body.items).toHaveLength(3)
    expect(res.body.items[0].promptVersion).toBe('v2')
    expect(res.body.total).toBe(10)
  })

  it('applies date range filter', async () => {
    ctx.prisma.inferenceLog.groupBy = jest.fn().mockResolvedValue([])
    ctx.prisma.inferenceLog.count.mockResolvedValue(0)
    await request(ctx.app.getHttpServer())
      .get('/api/prompt-metrics?from=2026-04-01&to=2026-04-30')
      .expect(200)
    const groupByCall = (ctx.prisma.inferenceLog.groupBy as jest.Mock).mock.calls[0][0]
    expect(groupByCall.where.createdAt).toBeDefined()
    expect(groupByCall.where.createdAt.gte).toBeInstanceOf(Date)
    expect(groupByCall.where.createdAt.lte).toBeInstanceOf(Date)
  })
})
