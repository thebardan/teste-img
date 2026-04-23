import * as request from 'supertest'
import { PresentationsController } from '../src/presentations/presentations.controller'
import { PresentationsService } from '../src/presentations/presentations.service'
import { UsersService } from '../src/users/users.service'
import { PromptEngineService } from '../src/ai/prompt-engine/prompt-engine.service'
import { BrandGuardianAgent } from '../src/ai/agents/brand-guardian.agent'
import { VisualSystemAgent } from '../src/ai/agents/visual-system.agent'
import { bootstrap, close, makePrismaMock, stubUserResolution, TEST_EDITOR, SYSTEM_USER, type E2EContext } from './e2e-setup'

describe('E2E /api/presentations', () => {
  let ctx: E2EContext
  const mockPromptEngine = {
    run: jest.fn().mockResolvedValue({
      parsedOutput: {
        slides: [
          { type: 'cover', title: 'Proposta', subtitle: 'Multilaser', body: [], cta: null },
          { type: 'context', title: 'Ctx', subtitle: null, body: ['a'], cta: null },
          { type: 'products', title: 'Products', subtitle: null, body: ['p'], cta: null },
          { type: 'benefits', title: 'Benefits', subtitle: null, body: ['b'], cta: null },
          { type: 'closing', title: 'End', subtitle: null, body: [], cta: 'Fale' },
        ],
        title: 'Title',
        subtitle: 'Sub',
        body: ['item'],
      },
    }),
  }
  const mockBrandGuardian = {
    selectLogo: jest.fn().mockResolvedValue({
      logoAssetId: 'l-1', logoUrl: 'https://logo', logoFormat: 'svg',
      selectionScore: 80, reason: 'best',
      rules: { minSize: { widthPct: 8, heightPct: 4 }, clearspace: { allSides: 25 }, forbiddenBackgrounds: [], maxLogoAreaPct: 12 },
      violations: [],
    }),
  }
  const mockVisualSystem = {
    generate: jest.fn().mockResolvedValue({
      palette: { background: '#111', backgroundSecondary: '#222', dominant: '#0f0', accent: '#f00', neutral: '#999', text: '#fff', textSecondary: '#ccc' },
      typography: { displayFont: 'Inter', bodyFont: 'Inter', scale: { hero: 40, headline: 30, subtitle: 24, body: 16, caption: 12, micro: 10 }, ratio: 1.25 },
      background: { type: 'gradient-linear', colors: ['#111', '#222'], angle: 135, overlay: { color: '#000', opacity: 0.2 }, texture: 'none' },
      mood: { style: 'tech', emotionalTone: 'premium', darkMode: true },
    }),
  }

  beforeEach(async () => {
    jest.clearAllMocks()
    const prisma = makePrismaMock()
    stubUserResolution(prisma, [SYSTEM_USER, TEST_EDITOR])
    ctx = await bootstrap({
      controllers: [PresentationsController],
      providers: [
        PresentationsService,
        UsersService,
        { provide: PromptEngineService, useValue: mockPromptEngine },
        { provide: BrandGuardianAgent, useValue: mockBrandGuardian },
        { provide: VisualSystemAgent, useValue: mockVisualSystem },
      ],
      prisma,
    })
  })

  afterEach(async () => { await close(ctx) })

  const header = { 'x-user-email': TEST_EDITOR.email, 'x-user-role': TEST_EDITOR.role }

  describe('GET /presentations', () => {
    it('returns paginated list', async () => {
      ctx.prisma.presentation.findMany.mockResolvedValue([{ id: 'p-1', title: 'P' }])
      ctx.prisma.presentation.count.mockResolvedValue(1)
      const res = await request(ctx.app.getHttpServer())
        .get('/api/presentations')
        .expect(200)
      expect(res.body.data).toHaveLength(1)
      expect(res.body.total).toBe(1)
    })
  })

  describe('GET /presentations/:id', () => {
    it('404 when not found', async () => {
      ctx.prisma.presentation.findUnique.mockResolvedValue(null)
      await request(ctx.app.getHttpServer()).get('/api/presentations/miss').expect(404)
    })

    it('returns full detail', async () => {
      ctx.prisma.presentation.findUnique.mockResolvedValue({
        id: 'p-1', title: 'Deck', versions: [], approvals: [],
      })
      const res = await request(ctx.app.getHttpServer())
        .get('/api/presentations/p-1')
        .expect(200)
      expect(res.body.id).toBe('p-1')
    })
  })

  describe('POST /presentations/generate', () => {
    it('generates with VisualSystem + per-slide copy', async () => {
      ctx.prisma.template.findUnique.mockResolvedValue({
        id: 'tpl-deck-corporate', name: 'Corp', zonesConfig: {},
      })
      ctx.prisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'P', sku: 'S', category: 'gamer', benefits: [{ text: 'b' }], specifications: [], images: [{ url: 'u' }] },
      ])
      ctx.prisma.client.findUnique.mockResolvedValue(null)
      ctx.prisma.presentation.create.mockResolvedValue({ id: 'p-new', title: 'Apresentação', versions: [] })

      const res = await request(ctx.app.getHttpServer())
        .post('/api/presentations/generate')
        .set(header)
        .send({ productIds: ['prod-1'] })
        .expect(201)

      expect(res.body.id).toBe('p-new')
      expect(mockVisualSystem.generate).toHaveBeenCalled()
      expect(ctx.prisma.presentation.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ authorId: TEST_EDITOR.id }),
      }))
    })

    it('uses client name in title', async () => {
      ctx.prisma.template.findUnique.mockResolvedValue({ id: 'tpl', name: 'T', zonesConfig: {} })
      ctx.prisma.product.findMany.mockResolvedValue([
        { id: 'prod-1', name: 'P', sku: 'S', category: 'gamer', benefits: [], specifications: [], images: [] },
      ])
      ctx.prisma.client.findUnique.mockResolvedValue({ id: 'c-1', name: 'Walmart' })
      ctx.prisma.presentation.create.mockImplementation((args: any) =>
        Promise.resolve({ ...args.data, id: 'p-new' }),
      )

      const res = await request(ctx.app.getHttpServer())
        .post('/api/presentations/generate')
        .set(header)
        .send({ productIds: ['prod-1'], clientId: 'c-1' })
        .expect(201)
      expect(res.body.title).toContain('Walmart')
    })
  })

  describe('slide CRUD', () => {
    const latestVersion = {
      id: 'v-1',
      slides: [
        { id: 's-0', order: 0, content: { type: 'cover', title: 'C' } },
        { id: 's-1', order: 1, content: { type: 'context', title: 'X' } },
        { id: 's-2', order: 2, content: { type: 'products', title: 'P' } },
      ],
    }

    function mockLoad() {
      ctx.prisma.presentation.findUnique.mockResolvedValue({
        id: 'p-1',
        clientId: null,
        versions: [latestVersion],
      })
    }

    it('PATCH /:id/slides/:order/content updates content', async () => {
      mockLoad()
      ctx.prisma.presentationSlide.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .patch('/api/presentations/p-1/slides/1/content')
        .send({ title: 'Novo' })
        .expect(200)
      expect(res.body.updated).toBe(true)
      expect(res.body.content.title).toBe('Novo')
    })

    it('PATCH 404 for bad slide order', async () => {
      mockLoad()
      await request(ctx.app.getHttpServer())
        .patch('/api/presentations/p-1/slides/99/content')
        .send({ title: 'X' })
        .expect(404)
    })

    it('POST /:id/slides/:order/regenerate regenerates single slide', async () => {
      mockLoad()
      ctx.prisma.presentationSlide.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .post('/api/presentations/p-1/slides/1/regenerate')
        .expect(201)
      expect(res.body.updated).toBe(true)
      expect(mockPromptEngine.run).toHaveBeenCalledWith('slide-copy', expect.any(Object))
    })

    it('POST /:id/slides/reorder updates order of each slide', async () => {
      mockLoad()
      ctx.prisma.presentationSlide.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .post('/api/presentations/p-1/slides/reorder')
        .send({ orderedIds: ['s-2', 's-0', 's-1'] })
        .expect(201)
      expect(res.body.reordered).toBe(true)
    })

    it('POST /:id/slides/reorder 400 on mismatch', async () => {
      mockLoad()
      await request(ctx.app.getHttpServer())
        .post('/api/presentations/p-1/slides/reorder')
        .send({ orderedIds: ['s-0', 's-1'] })
        .expect(400)
    })

    it('POST /:id/slides adds slide at end', async () => {
      mockLoad()
      ctx.prisma.presentationSlide.create.mockResolvedValue({ id: 's-new' })
      const res = await request(ctx.app.getHttpServer())
        .post('/api/presentations/p-1/slides')
        .send({ type: 'benefits' })
        .expect(201)
      expect(res.body.order).toBe(3)
    })

    it('POST /:id/slides with afterOrder inserts + shifts', async () => {
      mockLoad()
      ctx.prisma.presentationSlide.create.mockResolvedValue({ id: 's-new' })
      ctx.prisma.presentationSlide.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .post('/api/presentations/p-1/slides')
        .send({ type: 'products', afterOrder: 0 })
        .expect(201)
      expect(res.body.order).toBe(1)
    })

    it('DELETE /:id/slides/:order removes + shifts following', async () => {
      mockLoad()
      ctx.prisma.presentationSlide.delete.mockResolvedValue({})
      ctx.prisma.presentationSlide.update.mockResolvedValue({})
      const res = await request(ctx.app.getHttpServer())
        .delete('/api/presentations/p-1/slides/1')
        .expect(200)
      expect(res.body.removed).toBe(true)
    })
  })
})
