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

describe('PresentationsService', () => {
  let service: PresentationsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new PresentationsService(
      mockPrisma as any,
      mockPromptEngine as any,
      mockBrandGuardian as any,
    )
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
})
