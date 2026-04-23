import { NotFoundException } from '@nestjs/common'
import { SalesSheetsService } from './sales-sheets.service'

// ─── Shared mock factories ────────────────────────────────────────────────────

const mockProduct = {
  id: 'prod-1',
  name: 'Multi Headset Pro',
  sku: 'HC123',
  category: 'Áudio',
  description: 'Headset premium sem fio',
  qrDestination: 'https://multilaser.com.br/headset',
  benefits: [{ text: 'Som surround' }, { text: 'Bateria 30h' }, { text: 'Confortável' }],
  specifications: [{ key: 'Peso', value: '250', unit: 'g' }],
  images: [{ url: 'https://cdn.multilaser.com.br/headset.jpg' }],
}

const mockTemplate = {
  id: 'tpl-sales-sheet-horizontal',
  name: 'Sales Sheet Horizontal',
  zonesConfig: {
    headline: { x: 0, y: 0, w: 800, h: 100 },
    image: { x: 0, y: 100, w: 400, h: 400 },
  },
}

const mockUser = { id: 'user-1', email: 'admin@multilaser.com.br', name: 'Admin' }

const mockPrisma = {
  product: { findUnique: jest.fn() },
  user: { findFirst: jest.fn() },
  template: { findUnique: jest.fn() },
  salesSheet: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}

const mockCopywriter = {
  generate: jest.fn().mockResolvedValue({
    headline: 'Som que Transforma',
    subtitle: 'Áudio premium sem compromisso',
    benefits: ['Som surround', 'Bateria 30h', 'Design ergonômico'],
    cta: 'Compre agora',
  }),
}

const mockBrandGuardian = {
  selectLogo: jest.fn().mockResolvedValue({
    logoAssetId: 'logo-dark',
    logoUrl: 'https://cdn.multilaser.com.br/logo-dark.svg',
  }),
}

const mockCopyDirector = {
  generate: jest.fn().mockResolvedValue({
    variations: [
      { approach: 'emotional', headline: 'Som que Transforma', subtitle: 'Áudio premium', benefits: ['Som surround', 'Bateria 30h'], cta: 'Compre agora' },
      { approach: 'rational', headline: 'Headset Pro 250g', subtitle: 'Leve e potente', benefits: ['Som surround', 'Bateria 30h'], cta: 'Saiba mais' },
      { approach: 'aspirational', headline: 'Seu Próximo Nível', subtitle: 'Para quem exige o melhor', benefits: ['Som surround', 'Bateria 30h'], cta: 'Descubra' },
    ],
    selectedIndex: 0,
    toneProfile: { category: 'Áudio', channel: 'Varejo', voice: 'Melômano exigente' },
  }),
}

const mockVisualSystem = {
  generate: jest.fn().mockResolvedValue({
    palette: { dominant: '#0071e3', accent: '#ff6b00', neutral: '#666', background: '#111', backgroundSecondary: '#222', text: '#fff', textSecondary: '#ccc' },
    typography: { displayFont: 'Montserrat', bodyFont: 'Inter', scale: { hero: 39, headline: 31, subtitle: 25, body: 20, caption: 16, micro: 13 }, ratio: 1.25 },
    background: { type: 'gradient-linear', colors: ['#111', '#222', '#0071e3'], angle: 135, overlay: { color: '#000', opacity: 0.3 }, texture: 'none' },
    mood: { style: 'modern tech', emotionalTone: 'premium', darkMode: true },
  }),
}

const mockUsers = {
  resolveCaller: jest.fn().mockResolvedValue({ id: 'user-system', email: 'admin@multilaser.com.br' }),
  getSystemUser: jest.fn().mockResolvedValue({ id: 'user-system', email: 'admin@multilaser.com.br' }),
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('SalesSheetsService', () => {
  let service: SalesSheetsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new SalesSheetsService(
      mockPrisma as any,
      mockCopyDirector as any,
      mockVisualSystem as any,
      mockBrandGuardian as any,
      mockCopywriter as any,
      mockUsers as any,
    )
  })

  describe('findOne', () => {
    it('returns sheet when found', async () => {
      const sheet = { id: 'ss-1', title: 'Test', versions: [], approvals: [] }
      mockPrisma.salesSheet.findUnique.mockResolvedValue(sheet)
      await expect(service.findOne('ss-1')).resolves.toEqual(sheet)
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.salesSheet.findUnique.mockResolvedValue(null)
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('generate', () => {
    beforeEach(() => {
      mockPrisma.product.findUnique.mockResolvedValue(mockProduct)
      mockPrisma.user.findFirst.mockResolvedValue(mockUser)
      mockPrisma.template.findUnique.mockResolvedValue(mockTemplate)
      mockPrisma.salesSheet.create.mockImplementation(({ data }) =>
        Promise.resolve({
          id: 'ss-new',
          title: data.title,
          status: data.status,
          productId: data.productId,
          templateId: data.templateId,
          authorId: data.authorId,
          versions: [{ versionNumber: 1, content: {} }],
          product: { name: mockProduct.name, sku: mockProduct.sku },
          template: { name: mockTemplate.name },
        }),
      )
    })

    it('generates a sales sheet with correct structure', async () => {
      const result = await service.generate({
        productId: 'prod-1',
        templateId: 'tpl-sales-sheet-horizontal',
      } as any)

      expect(result.salesSheet.id).toBe('ss-new')
      expect(result.content.variations).toHaveLength(3)
      expect(result.content.variations[0].copy.headline).toBeDefined()
      expect(result.content.selectedVariation).toBe(0)
      expect(result.logoSelection.logoAssetId).toBe('logo-dark')
    })

    it('throws NotFoundException when product does not exist', async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null)
      await expect(
        service.generate({ productId: 'missing', templateId: 'tpl-1' } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('calls CopyDirector with product data', async () => {
      await service.generate({ productId: 'prod-1' } as any)
      expect(mockCopyDirector.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Multi Headset Pro',
          sku: 'HC123',
          category: 'Áudio',
        }),
      )
    })

    it('calls VisualSystemAgent', async () => {
      await service.generate({ productId: 'prod-1' } as any)
      expect(mockVisualSystem.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          productName: 'Multi Headset Pro',
          category: 'Áudio',
        }),
      )
    })

    it('calls BrandGuardianAgent to select logo', async () => {
      await service.generate({ productId: 'prod-1' } as any)
      expect(mockBrandGuardian.selectLogo).toHaveBeenCalled()
    })
  })

  describe('updateStatus', () => {
    it('updates the status of a sheet', async () => {
      mockPrisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'APPROVED' })
      const result = await service.updateStatus('ss-1', 'APPROVED')
      expect(result.status).toBe('APPROVED')
      expect(mockPrisma.salesSheet.update).toHaveBeenCalledWith({
        where: { id: 'ss-1' },
        data: { status: 'APPROVED' },
      })
    })
  })
})
