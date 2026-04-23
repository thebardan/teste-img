import * as request from 'supertest'
import { SalesSheetsController } from '../src/sales-sheets/sales-sheets.controller'
import { SalesSheetsService } from '../src/sales-sheets/sales-sheets.service'
import { ArtComposerService } from '../src/sales-sheets/services/art-composer.service'
import { UsersService } from '../src/users/users.service'
import { CopyDirectorAgent } from '../src/ai/agents/copy-director.agent'
import { VisualSystemAgent } from '../src/ai/agents/visual-system.agent'
import { BrandGuardianAgent } from '../src/ai/agents/brand-guardian.agent'
import { SalesCopywriterAgent } from '../src/ai/agents/sales-copywriter.agent'
import { GeminiArtProvider } from '../src/ai/providers/gemini/gemini-art.provider'
import { StorageService } from '../src/storage/storage.service'
import { getQueueToken } from '@nestjs/bullmq'
import { QUEUE_GENERATION } from '../src/queue/queue.constants'
import { bootstrap, close, makePrismaMock, stubUserResolution, TEST_EDITOR, SYSTEM_USER, type E2EContext } from './e2e-setup'

describe('E2E /api/sales-sheets', () => {
  let ctx: E2EContext
  const mockCopyDirector = {
    generate: jest.fn().mockResolvedValue({
      variations: [
        { approach: 'emotional', headline: 'Emotional H', subtitle: 'S', benefits: ['a','b','c'], cta: 'Compre' },
        { approach: 'rational', headline: 'Rational H', subtitle: 'S2', benefits: ['a','b','c'], cta: 'Leve' },
        { approach: 'aspirational', headline: 'Aspirational H', subtitle: 'S3', benefits: ['a','b','c'], cta: 'Supere' },
      ],
      selectedIndex: 0,
      toneProfile: { category: 'gamer', channel: 'Varejo', voice: 'guerreiro' },
    }),
  }
  const vsPayload = {
    palette: { background: '#111', backgroundSecondary: '#222', dominant: '#0f0', accent: '#f00', neutral: '#999', text: '#fff', textSecondary: '#ccc' },
    typography: { displayFont: 'Inter', bodyFont: 'Inter', scale: { hero: 40, headline: 30, subtitle: 24, body: 16, caption: 12, micro: 10 }, ratio: 1.25 },
    background: { type: 'gradient-linear', colors: ['#111', '#222'], angle: 135, overlay: { color: '#000', opacity: 0.2 }, texture: 'none' },
    mood: { style: 'tech', emotionalTone: 'premium', darkMode: true },
  }
  const mockVisualSystem = { generate: jest.fn().mockResolvedValue(vsPayload) }
  const mockBrandGuardian = {
    selectLogo: jest.fn().mockResolvedValue({
      logoAssetId: 'l-1', logoUrl: 'https://logo', logoFormat: 'svg',
      selectionScore: 80, reason: 'ok',
      rules: { minSize: { widthPct: 8, heightPct: 4 }, clearspace: { allSides: 25 }, forbiddenBackgrounds: [], maxLogoAreaPct: 12 },
      violations: [],
    }),
  }
  const mockCopywriter = {
    generate: jest.fn().mockResolvedValue({
      headline: 'Regen H', subtitle: 'Regen S', benefits: ['x','y','z'], cta: 'Regen CTA',
    }),
  }
  const mockArtProvider = {
    generate: jest.fn().mockResolvedValue({ imageBase64: Buffer.from('x').toString('base64'), mimeType: 'image/png', model: 'm', durationMs: 1 }),
  }
  const mockStorage = {
    upload: jest.fn().mockResolvedValue(undefined),
    getBuffer: jest.fn().mockResolvedValue(Buffer.from('img')),
    getPresignedUrl: jest.fn().mockImplementation((k: string) => Promise.resolve(`https://s/${k}`)),
    extractKey: jest.fn().mockImplementation((u: string) => u),
  }
  const mockQueue = { add: jest.fn().mockResolvedValue({ id: 'j-1' }) }

  beforeEach(async () => {
    jest.clearAllMocks()
    const prisma = makePrismaMock()
    stubUserResolution(prisma, [SYSTEM_USER, TEST_EDITOR])
    ctx = await bootstrap({
      controllers: [SalesSheetsController],
      providers: [
        SalesSheetsService,
        ArtComposerService,
        UsersService,
        { provide: CopyDirectorAgent, useValue: mockCopyDirector },
        { provide: VisualSystemAgent, useValue: mockVisualSystem },
        { provide: BrandGuardianAgent, useValue: mockBrandGuardian },
        { provide: SalesCopywriterAgent, useValue: mockCopywriter },
        { provide: GeminiArtProvider, useValue: mockArtProvider },
        { provide: StorageService, useValue: mockStorage },
        { provide: getQueueToken(QUEUE_GENERATION), useValue: mockQueue },
      ],
      prisma,
    })
  })

  afterEach(async () => { await close(ctx) })

  const header = { 'x-user-email': TEST_EDITOR.email, 'x-user-role': TEST_EDITOR.role }

  describe('GET /sales-sheets', () => {
    it('returns paginated list', async () => {
      ctx.prisma.salesSheet.findMany.mockResolvedValue([{ id: 'ss-1' }])
      ctx.prisma.salesSheet.count.mockResolvedValue(1)
      const res = await request(ctx.app.getHttpServer())
        .get('/api/sales-sheets?page=1&pageSize=10')
        .expect(200)
      expect(res.body.total).toBe(1)
    })
  })

  describe('GET /sales-sheets/:id', () => {
    it('404 when not found', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue(null)
      await request(ctx.app.getHttpServer()).get('/api/sales-sheets/miss').expect(404)
    })
  })

  describe('POST /sales-sheets/generate', () => {
    it('runs Designer Engine pipeline with 3 VisualSystems', async () => {
      ctx.prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1', name: 'P', sku: 'S', category: 'gamer', description: 'd',
        benefits: [{ text: 'b1' }], specifications: [], images: [{ url: 'u' }],
      })
      ctx.prisma.template.findUnique.mockResolvedValue({
        id: 'tpl-sales-sheet-horizontal', name: 'Horizontal', zonesConfig: {},
      })
      ctx.prisma.salesSheet.create.mockImplementation((args: any) =>
        Promise.resolve({ ...args.data, id: 'ss-new', versions: [], product: { name: 'P', sku: 'S' }, template: { name: 'Horizontal' } }),
      )

      const res = await request(ctx.app.getHttpServer())
        .post('/api/sales-sheets/generate')
        .set(header)
        .send({ productId: 'prod-1' })
        .expect(201)

      expect(res.body.salesSheet.id).toBe('ss-new')
      expect(mockCopyDirector.generate).toHaveBeenCalled()
      // 3 distinct VisualSystems (one per copy variation)
      expect(mockVisualSystem.generate).toHaveBeenCalledTimes(3)
      expect(res.body.content.variations).toHaveLength(3)
      expect(res.body.content.layoutAlternatives).toBeDefined()
    })

    it('uses real author from header, not system hardcode', async () => {
      ctx.prisma.product.findUnique.mockResolvedValue({
        id: 'prod-1', name: 'P', sku: 'S', category: 'gamer', description: 'd',
        benefits: [], specifications: [], images: [],
      })
      ctx.prisma.template.findUnique.mockResolvedValue({
        id: 'tpl-sales-sheet-horizontal', name: 'H', zonesConfig: {},
      })
      ctx.prisma.salesSheet.create.mockResolvedValue({ id: 'ss-new', versions: [{ id: 'v-1' }] })

      await request(ctx.app.getHttpServer())
        .post('/api/sales-sheets/generate')
        .set(header)
        .send({ productId: 'prod-1' })
        .expect(201)

      expect(ctx.prisma.salesSheet.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ authorId: TEST_EDITOR.id }),
      }))
    })
  })

  describe('PATCH /sales-sheets/:id/content', () => {
    it('merges partial content into latest version', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1',
        versions: [{ id: 'v-1', content: { headline: 'Old', subtitle: 'S' } }],
      })
      ctx.prisma.salesSheetVersion.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .patch('/api/sales-sheets/ss-1/content')
        .send({ headline: 'New' })
        .expect(200)
      expect(res.body.content.headline).toBe('New')
      expect(res.body.content.subtitle).toBe('S')
    })
  })

  describe('POST /sales-sheets/:id/regenerate-field', () => {
    it('regenerates headline using Copywriter', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1',
        product: { id: 'p1', name: 'P', sku: 'S', category: 'gamer', description: 'd', benefits: [], specifications: [] },
        versions: [{ id: 'v-1', content: { headline: 'Old' } }],
      })
      ctx.prisma.salesSheetVersion.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .post('/api/sales-sheets/ss-1/regenerate-field')
        .send({ field: 'headline', guidance: 'mais agressivo' })
        .expect(201)
      expect(res.body.field).toBe('headline')
      expect(res.body.value).toBe('Regen H')
    })

    it('returns error for unknown field', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1',
        product: { id: 'p1', name: 'P', sku: 'S', category: 'g', description: 'd', benefits: [], specifications: [] },
        versions: [{ id: 'v-1', content: {} }],
      })
      const res = await request(ctx.app.getHttpServer())
        .post('/api/sales-sheets/ss-1/regenerate-field')
        .send({ field: 'xxx' })
        .expect(201)
      expect(res.body.error).toMatch(/cannot be regenerated/)
    })
  })

  describe('POST /sales-sheets/:id/more-variations', () => {
    it('appends 3 variations using CopyDirector', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1',
        product: { id: 'p1', name: 'P', sku: 'S', category: 'gamer', description: 'd', benefits: [], specifications: [] },
        versions: [{ id: 'v-1', content: { variations: [{ copy: {} }] } }],
      })
      ctx.prisma.salesSheetVersion.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .post('/api/sales-sheets/ss-1/more-variations')
        .send({ guidance: 'B2B' })
        .expect(201)
      expect(res.body.addedCount).toBe(3)
      expect(res.body.content.variations).toHaveLength(4) // 1 existing + 3 new
    })
  })

  describe('POST /sales-sheets/:id/generate-art', () => {
    it('generates art and persists to version', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1',
        product: { name: 'P', category: 'g', description: 'd', images: [], benefits: [], specifications: [] },
        template: { type: 'SALES_SHEET_HORIZONTAL', zonesConfig: {} },
        versions: [{ id: 'v-1', versionNumber: 1, content: { headline: 'H' } }],
      })
      ctx.prisma.salesSheetVersion.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .post('/api/sales-sheets/ss-1/generate-art')
        .send({ prompt: 'premium feel' })
        .expect(201)
      expect(res.body.artImageUrl).toMatch(/^https:\/\/s\//)
      expect(mockArtProvider.generate).toHaveBeenCalled()
    })
  })

  describe('POST /sales-sheets/:id/generate-art-batch-async', () => {
    it('creates GenerationJob + enqueues BullMQ', async () => {
      ctx.prisma.generationJob.create.mockResolvedValue({ id: 'job-1' })
      const res = await request(ctx.app.getHttpServer())
        .post('/api/sales-sheets/ss-1/generate-art-batch-async')
        .send({ count: 3, prompt: 'x' })
        .expect(201)
      expect(res.body.jobId).toBe('job-1')
      expect(mockQueue.add).toHaveBeenCalledWith('art-batch', expect.objectContaining({
        jobId: 'job-1', salesSheetId: 'ss-1', count: 3,
      }), expect.any(Object))
    })

    it('clamps count to 5 max', async () => {
      ctx.prisma.generationJob.create.mockResolvedValue({ id: 'job-2' })
      await request(ctx.app.getHttpServer())
        .post('/api/sales-sheets/ss-1/generate-art-batch-async')
        .send({ count: 100 })
        .expect(201)
      expect(ctx.prisma.generationJob.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          payload: expect.objectContaining({ count: 5 }),
        }),
      }))
    })
  })

  describe('GET /sales-sheets/art-jobs/:jobId', () => {
    it('returns job status', async () => {
      ctx.prisma.generationJob.findUnique.mockResolvedValue({
        id: 'job-1',
        status: 'COMPLETED',
        payload: { count: 3, results: [{ artImageUrl: 'u', artImageKey: 'k' }] },
      })
      const res = await request(ctx.app.getHttpServer())
        .get('/api/sales-sheets/art-jobs/job-1')
        .expect(200)
      expect(res.body.status).toBe('COMPLETED')
    })

    it('404 when missing', async () => {
      ctx.prisma.generationJob.findUnique.mockResolvedValue(null)
      await request(ctx.app.getHttpServer())
        .get('/api/sales-sheets/art-jobs/miss')
        .expect(404)
    })
  })
})
