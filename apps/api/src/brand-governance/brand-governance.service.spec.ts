import { BrandGovernanceService } from './brand-governance.service'

const mockPrisma = {
  tonePreset: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  channelCtaPreset: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
  },
  client: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}

describe('BrandGovernanceService', () => {
  let service: BrandGovernanceService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new BrandGovernanceService(mockPrisma as any)
  })

  describe('getToneForCategory', () => {
    it('returns exact-match preset when active', async () => {
      mockPrisma.tonePreset.findUnique.mockResolvedValue({
        category: 'gamer',
        tone: 'intenso',
        voice: 'guerreiro',
        isActive: true,
      })
      const r = await service.getToneForCategory('gamer')
      expect(r).toEqual({ tone: 'intenso', voice: 'guerreiro' })
    })

    it('ignores inactive preset and falls to default', async () => {
      mockPrisma.tonePreset.findUnique.mockResolvedValue({ category: 'gamer', tone: 'x', voice: 'y', isActive: false })
      mockPrisma.tonePreset.findMany.mockResolvedValue([])
      const r = await service.getToneForCategory('gamer')
      expect(r.voice).toMatch(/especialista de produto Multilaser/)
    })

    it('does partial match when no exact', async () => {
      mockPrisma.tonePreset.findUnique.mockResolvedValue(null)
      mockPrisma.tonePreset.findMany.mockResolvedValue([
        { category: 'áudio', tone: 'sensorial', voice: 'maestro', isActive: true },
      ])
      const r = await service.getToneForCategory('fone de áudio premium')
      expect(r).toEqual({ tone: 'sensorial', voice: 'maestro' })
    })
  })

  describe('getCtasForChannel', () => {
    it('returns DB CTAs when present and active', async () => {
      mockPrisma.channelCtaPreset.findUnique.mockResolvedValue({
        channel: 'Varejo',
        ctas: ['X', 'Y'],
        isActive: true,
      })
      const r = await service.getCtasForChannel('Varejo')
      expect(r).toEqual(['X', 'Y'])
    })

    it('falls to default when channel missing', async () => {
      mockPrisma.channelCtaPreset.findUnique.mockResolvedValue(null)
      const r = await service.getCtasForChannel('Unknown')
      expect(r.length).toBeGreaterThan(0)
      expect(r[0]).toMatch(/Compre/)
    })

    it('ignores inactive preset', async () => {
      mockPrisma.channelCtaPreset.findUnique.mockResolvedValue({
        channel: 'Varejo',
        ctas: ['X'],
        isActive: false,
      })
      const r = await service.getCtasForChannel('Varejo')
      expect(r).not.toEqual(['X'])
    })
  })

  describe('client brand profile', () => {
    it('returns null when client missing', async () => {
      mockPrisma.client.findUnique.mockResolvedValue(null)
      expect(await service.getClientProfile('c-1')).toBeNull()
    })

    it('returns stored profile', async () => {
      mockPrisma.client.findUnique.mockResolvedValue({
        brandProfile: { voice: 'corporate', forbiddenTerms: ['barato'] },
      })
      expect(await service.getClientProfile('c-1')).toEqual({
        voice: 'corporate',
        forbiddenTerms: ['barato'],
      })
    })

    it('updateClientProfile writes to prisma', async () => {
      mockPrisma.client.update.mockResolvedValue({ id: 'c-1' })
      await service.updateClientProfile('c-1', { voice: 'premium' })
      expect(mockPrisma.client.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { brandProfile: { voice: 'premium' } },
      })
    })
  })
})
