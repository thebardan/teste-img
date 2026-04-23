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

  it('GET / aggregates by (promptId, promptVersion)', async () => {
    ctx.prisma.inferenceLog.findMany.mockResolvedValue([
      { promptId: 'copy-director', promptVersion: '1.0.0', durationMs: 500, success: true,
        salesSheetVersion: { salesSheet: { status: 'APPROVED' } }, presentationVersion: null },
      { promptId: 'copy-director', promptVersion: '1.0.0', durationMs: 700, success: true,
        salesSheetVersion: { salesSheet: { status: 'APPROVED' } }, presentationVersion: null },
      { promptId: 'copy-director', promptVersion: '1.0.0', durationMs: 600, success: true,
        salesSheetVersion: { salesSheet: { status: 'REJECTED' } }, presentationVersion: null },
      { promptId: 'copy-director', promptVersion: '2.0.0', durationMs: 300, success: true,
        salesSheetVersion: { salesSheet: { status: 'APPROVED' } }, presentationVersion: null },
    ])

    const res = await request(ctx.app.getHttpServer())
      .get('/api/prompt-metrics')
      .expect(200)

    expect(res.body).toHaveLength(2)
    const v1 = res.body.find((r: any) => r.promptVersion === '1.0.0')
    expect(v1.usage).toBe(3)
    expect(v1.approvedCount).toBe(2)
    expect(v1.rejectedCount).toBe(1)
    expect(v1.approvalRate).toBeCloseTo(2 / 3, 2)

    const v2 = res.body.find((r: any) => r.promptVersion === '2.0.0')
    expect(v2.approvalRate).toBe(1)
  })

  it('GET /:promptId filters to specific prompt', async () => {
    ctx.prisma.inferenceLog.findMany.mockResolvedValue([
      { promptId: 'qa-check', promptVersion: '1.0.0', durationMs: 100, success: true,
        salesSheetVersion: null, presentationVersion: null },
      { promptId: 'copy-director', promptVersion: '1.0.0', durationMs: 200, success: true,
        salesSheetVersion: null, presentationVersion: null },
    ])
    const res = await request(ctx.app.getHttpServer())
      .get('/api/prompt-metrics/qa-check')
      .expect(200)
    expect(res.body).toHaveLength(1)
    expect(res.body[0].promptId).toBe('qa-check')
  })
})
