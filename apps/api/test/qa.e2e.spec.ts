import * as request from 'supertest'
import { QAController } from '../src/qa/qa.controller'
import { QAService } from '../src/qa/qa.service'
import { QAAgent } from '../src/ai/agents/qa.agent'
import { ImageQAService } from '../src/ai/qa/image-qa.service'
import { GeminiVisionProvider } from '../src/ai/providers/gemini/gemini-vision.provider'
import { StorageService } from '../src/storage/storage.service'
import { bootstrap, close, makePrismaMock, type E2EContext } from './e2e-setup'

describe('E2E /api/qa', () => {
  let ctx: E2EContext

  const mockQAAgent = {
    checkSalesSheet: jest.fn().mockResolvedValue({
      score: 80, passed: true, checks: [], aiFindings: [], checkedAt: new Date().toISOString(),
    }),
    checkPresentation: jest.fn().mockResolvedValue({
      score: 85, passed: true, checks: [], aiFindings: [], checkedAt: new Date().toISOString(),
    }),
  }
  const mockVision = {
    analyze: jest.fn().mockResolvedValue(JSON.stringify({
      score: 82,
      findings: [
        { severity: 'WARNING', category: 'legibility', message: 'CTA pequeno', fixSuggestion: 'aumentar tamanho' },
      ],
    })),
  }
  const mockStorage = {
    getBuffer: jest.fn().mockResolvedValue(Buffer.from('img')),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const prisma = makePrismaMock()
    ctx = await bootstrap({
      controllers: [QAController],
      providers: [
        QAService,
        ImageQAService,
        { provide: QAAgent, useValue: mockQAAgent },
        { provide: GeminiVisionProvider, useValue: mockVision },
        { provide: StorageService, useValue: mockStorage },
      ],
      prisma,
    })
  })

  afterEach(async () => { await close(ctx) })

  it('POST /qa/sales-sheet/:id runs text QA', async () => {
    ctx.prisma.salesSheet.findUnique.mockResolvedValue({
      id: 'ss-1',
      product: { name: 'P' },
      versions: [{ id: 'v-1', content: { headline: 'H' } }],
    })
    const res = await request(ctx.app.getHttpServer())
      .post('/api/qa/sales-sheet/ss-1')
      .expect(201)
    expect(res.body.score).toBe(80)
    expect(mockQAAgent.checkSalesSheet).toHaveBeenCalledWith({ headline: 'H' }, 'P')
  })

  it('POST /qa/presentation/:id runs text QA', async () => {
    ctx.prisma.presentation.findUnique.mockResolvedValue({
      id: 'p-1',
      title: 'T',
      versions: [{ id: 'v-1', slides: [{ order: 0, content: { type: 'cover', title: 'Cover' } }] }],
    })
    const res = await request(ctx.app.getHttpServer())
      .post('/api/qa/presentation/p-1')
      .expect(201)
    expect(res.body.score).toBe(85)
  })

  it('POST /qa/sales-sheet/:id 404 when no version', async () => {
    ctx.prisma.salesSheet.findUnique.mockResolvedValue({
      id: 'ss-1', product: { name: 'P' }, versions: [],
    })
    await request(ctx.app.getHttpServer())
      .post('/api/qa/sales-sheet/ss-1')
      .expect(404)
  })

  it('POST /qa/sales-sheet/:id/art calls Vision provider', async () => {
    ctx.prisma.salesSheet.findUnique.mockResolvedValue({
      id: 'ss-1',
      product: { name: 'P', category: 'g' },
      versions: [{
        id: 'v-1',
        artImageKey: 'art/x.png',
        content: { headline: 'H', visualDirection: { colors: ['#111'] }, logoUrl: 'l' },
      }],
    })
    const res = await request(ctx.app.getHttpServer())
      .post('/api/qa/sales-sheet/ss-1/art')
      .expect(201)
    expect(res.body.score).toBe(82)
    expect(res.body.findings[0].category).toBe('legibility')
    expect(mockVision.analyze).toHaveBeenCalled()
  })

  it('POST /qa/sales-sheet/:id/art 404 when no artImageKey', async () => {
    ctx.prisma.salesSheet.findUnique.mockResolvedValue({
      id: 'ss-1',
      product: { name: 'P', category: 'g' },
      versions: [{ id: 'v-1', content: {} }],
    })
    await request(ctx.app.getHttpServer())
      .post('/api/qa/sales-sheet/ss-1/art')
      .expect(404)
  })
})
