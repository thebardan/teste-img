import { NotFoundException } from '@nestjs/common'
import { BrandAssetsService } from './brand-assets.service'

const mockPrisma = {
  brandAsset: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
}

describe('BrandAssetsService', () => {
  let service: BrandAssetsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new BrandAssetsService(mockPrisma as any)
  })

  describe('findOne', () => {
    it('returns the asset when found', async () => {
      const asset = { id: 'a1', name: 'Multi Logo Dark', rules: [] }
      mockPrisma.brandAsset.findUnique.mockResolvedValue(asset)
      await expect(service.findOne('a1')).resolves.toEqual(asset)
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.brandAsset.findUnique.mockResolvedValue(null)
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('selectBest', () => {
    const makeAsset = (id: string, bestOn: string, rules: any[]) => ({
      id,
      bestOn,
      rules,
      isActive: true,
      type: 'LOGO',
    })

    it('returns null when no active logos exist', async () => {
      mockPrisma.brandAsset.findMany.mockResolvedValue([])
      await expect(service.selectBest('DARK')).resolves.toBeNull()
    })

    it('prefers the asset with an exact-match rule for the background', async () => {
      const assets = [
        makeAsset('logo-dark', 'DARK', [
          { condition: "background === 'DARK'", score: 95 },
        ]),
        makeAsset('logo-light', 'LIGHT', [
          { condition: "background === 'LIGHT'", score: 95 },
        ]),
      ]
      mockPrisma.brandAsset.findMany.mockResolvedValue(assets)
      const result = await service.selectBest('DARK')
      expect(result?.id).toBe('logo-dark')
    })

    it('falls back to bestOn field score when no exact rule matches', async () => {
      const assets = [
        makeAsset('logo-dark', 'DARK', []),
        makeAsset('logo-light', 'LIGHT', []),
      ]
      mockPrisma.brandAsset.findMany.mockResolvedValue(assets)
      const result = await service.selectBest('DARK')
      expect(result?.id).toBe('logo-dark')
    })
  })
})
