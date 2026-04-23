import { NotFoundException } from '@nestjs/common'
import { PresentationsService } from './presentations.service'

const mockUser = { id: 'user-1', email: 'admin@multilaser.com.br', name: 'Admin' }
const mockTemplate = {
  id: 'tpl-deck-corporate',
  name: 'Deck Corporativo',
  zonesConfig: { headline: { x: 0, y: 0, w: 1280, h: 100 } },
}
const mockProduct = {
  id: 'prod-1',
  name: 'Multi Headset Pro',
  sku: 'HC123',
  benefits: [{ text: 'Som surround' }],
  specifications: [{ key: 'Peso', value: '250', unit: 'g' }],
  images: [{ url: 'https://cdn.multilaser.com.br/headset.jpg', order: 0 }],
}

const mockPrisma = {
  user: { findFirst: jest.fn() },
  template: { findUnique: jest.fn() },
  product: { findMany: jest.fn() },
  client: { findUnique: jest.fn() },
  presentation: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    count: jest.fn().mockResolvedValue(1),
  },
}

const mockPromptEngine = {
  run: jest.fn().mockResolvedValue({
    parsedOutput: {
      title: 'Slide title',
      subtitle: 'Subtitle',
      body: ['Item 1', 'Item 2'],
    },
  }),
}

const mockBrandGuardian = {
  selectLogo: jest.fn().mockResolvedValue({
    logoAssetId: 'logo-dark',
    logoUrl: 'https://cdn.multilaser.com.br/logo-dark.svg',
  }),
}

const mockUsers = {
  resolveCaller: jest.fn().mockResolvedValue({ id: 'user-system', email: 'admin@multilaser.com.br' }),
  getSystemUser: jest.fn().mockResolvedValue({ id: 'user-system', email: 'admin@multilaser.com.br' }),
}

const mockVisualSystem = {
  generate: jest.fn().mockResolvedValue({
    palette: { dominant: '#0071e3', accent: '#ff6b00', neutral: '#666', background: '#111', backgroundSecondary: '#222', text: '#fff', textSecondary: '#ccc' },
    typography: { displayFont: 'Montserrat', bodyFont: 'Inter', scale: { hero: 39, headline: 31, subtitle: 25, body: 20, caption: 16, micro: 13 }, ratio: 1.25 },
    background: { type: 'gradient-linear', colors: ['#111', '#222', '#0071e3'], angle: 135, overlay: { color: '#000', opacity: 0.3 }, texture: 'none' },
    mood: { style: 'modern tech', emotionalTone: 'premium', darkMode: true },
  }),
}

describe('PresentationsService', () => {
  let service: PresentationsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new PresentationsService(
      mockPrisma as any,
      mockPromptEngine as any,
      mockBrandGuardian as any,
      mockVisualSystem as any,
      mockUsers as any,
    )

    // Extend mockPrisma for slide CRUD tests
    ;(mockPrisma as any).presentationSlide = {
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    }
    ;(mockPrisma as any).$transaction = jest.fn((ops: Promise<any>[]) => Promise.all(ops))
  })

  describe('findOne', () => {
    it('returns presentation when found', async () => {
      const p = { id: 'pres-1', title: 'Test', versions: [], approvals: [] }
      mockPrisma.presentation.findUnique.mockResolvedValue(p)
      await expect(service.findOne('pres-1')).resolves.toEqual(p)
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.presentation.findUnique.mockResolvedValue(null)
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('generate', () => {
    const dto = {
      productIds: ['prod-1'],
      templateId: 'tpl-deck-corporate',
    } as any

    beforeEach(() => {
      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockPrisma.template.findUnique.mockResolvedValue(mockTemplate)
      mockPrisma.product.findMany.mockResolvedValue([mockProduct])
      mockPrisma.presentation.create.mockResolvedValue({
        id: 'pres-new',
        title: 'Apresentação — Multi Headset Pro',
        status: 'DRAFT',
        client: null,
        template: { name: 'Deck Corporativo' },
        versions: [{ slides: [] }],
      })
    })

    it('creates a presentation with DRAFT status', async () => {
      const result = await service.generate(dto)
      expect(result.id).toBe('pres-new')
      expect(result.status).toBe('DRAFT')
    })

    it('calls promptEngine.run for slide-structure + 5 slide-copy prompts', async () => {
      await service.generate(dto)
      // 1 slide-structure call + 5 slide-copy calls (one per slide)
      expect(mockPromptEngine.run).toHaveBeenCalledTimes(6)
      expect(mockPromptEngine.run).toHaveBeenCalledWith('slide-structure', expect.any(Object))
      expect(mockPromptEngine.run).toHaveBeenCalledWith('slide-copy', expect.any(Object))
    })

    it('calls BrandGuardian to select logo', async () => {
      await service.generate(dto)
      expect(mockBrandGuardian.selectLogo).toHaveBeenCalled()
    })

    it('throws when no valid products are found', async () => {
      mockPrisma.product.findMany.mockResolvedValue([])
      await expect(service.generate(dto)).rejects.toThrow(/No valid products/)
    })

    it('uses client name in title when clientId is provided', async () => {
      mockPrisma.client.findUnique.mockResolvedValue({ id: 'client-1', name: 'Walmart' })
      mockPrisma.presentation.create.mockResolvedValue({
        id: 'pres-w',
        title: 'Walmart — Multi Headset Pro',
        status: 'DRAFT',
        client: { name: 'Walmart' },
        template: { name: 'Deck Corporativo' },
        versions: [{ slides: [] }],
      })

      const result = await service.generate({ ...dto, clientId: 'client-1' })
      expect(result.title).toContain('Walmart')
    })
  })

  describe('slide CRUD', () => {
    const latestVersion = {
      id: 'v-1',
      slides: [
        { id: 's-0', order: 0, content: { type: 'cover', title: 'Cover' } },
        { id: 's-1', order: 1, content: { type: 'context', title: 'Context' } },
        { id: 's-2', order: 2, content: { type: 'products', title: 'Products' } },
      ],
    }

    function mockLoadLatest() {
      mockPrisma.presentation.findUnique.mockResolvedValue({
        id: 'p-1',
        clientId: null,
        versions: [latestVersion],
      })
    }

    it('updateSlideContent merges partial content into correct slide', async () => {
      mockLoadLatest()
      const result = await service.updateSlideContent('p-1', 1, { title: 'Novo título' })
      expect(result.updated).toBe(true)
      const call = (mockPrisma as any).presentationSlide.update.mock.calls[0][0]
      expect(call.where.id).toBe('s-1')
      expect(call.data.content.title).toBe('Novo título')
      // preserved
      expect(call.data.content.type).toBe('context')
    })

    it('updateSlideContent 404s for missing slide', async () => {
      mockLoadLatest()
      await expect(service.updateSlideContent('p-1', 99, { title: 'X' })).rejects.toThrow(/Slide 99/)
    })

    it('reorderSlides rejects mismatched ids', async () => {
      mockLoadLatest()
      await expect(service.reorderSlides('p-1', ['s-0', 's-1'])).rejects.toThrow(/must match/)
    })

    it('reorderSlides updates order for each slide', async () => {
      mockLoadLatest()
      await service.reorderSlides('p-1', ['s-2', 's-0', 's-1'])
      expect((mockPrisma as any).presentationSlide.update).toHaveBeenCalledTimes(3)
    })

    it('removeSlide deletes + shifts order for subsequent slides', async () => {
      mockLoadLatest()
      await service.removeSlide('p-1', 1)
      expect((mockPrisma as any).presentationSlide.delete).toHaveBeenCalledWith({ where: { id: 's-1' } })
      expect((mockPrisma as any).presentationSlide.update).toHaveBeenCalledWith({
        where: { id: 's-2' },
        data: { order: 1 },
      })
    })

    it('addSlide appends at end when afterOrder omitted', async () => {
      mockLoadLatest()
      await service.addSlide('p-1', 'benefits')
      const createCall = (mockPrisma as any).presentationSlide.create.mock.calls[0][0]
      expect(createCall.data.order).toBe(3)
      expect(createCall.data.content.type).toBe('benefits')
    })

    it('addSlide inserts after given order + shifts later slides', async () => {
      mockLoadLatest()
      await service.addSlide('p-1', 'benefits', 0)
      // All slides with order >= 1 must be updated
      const updateCalls = (mockPrisma as any).presentationSlide.update.mock.calls
      expect(updateCalls.length).toBeGreaterThanOrEqual(2)
      const createCall = (mockPrisma as any).presentationSlide.create.mock.calls[0][0]
      expect(createCall.data.order).toBe(1)
    })
  })
})
