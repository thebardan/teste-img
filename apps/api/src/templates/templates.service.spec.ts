import { NotFoundException } from '@nestjs/common'
import { TemplatesService } from './templates.service'
import { TemplateType } from '@prisma/client'

const mockPrisma = {
  template: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  templateVariant: {
    create: jest.fn(),
    findFirst: jest.fn(),
    delete: jest.fn(),
  },
}

const sampleTemplate = {
  id: 'tpl-1',
  name: 'Sales Sheet Horizontal',
  type: TemplateType.SALES_SHEET_HORIZONTAL,
  isActive: true,
  variants: [],
}

describe('TemplatesService', () => {
  let service: TemplatesService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new TemplatesService(mockPrisma as any)
  })

  describe('findOne', () => {
    it('returns template when found', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(sampleTemplate)
      await expect(service.findOne('tpl-1')).resolves.toEqual(sampleTemplate)
    })

    it('throws NotFoundException when not found', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null)
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('create', () => {
    it('creates a template and returns it', async () => {
      mockPrisma.template.create.mockResolvedValue(sampleTemplate)
      const result = await service.create({
        name: 'Sales Sheet Horizontal',
        type: TemplateType.SALES_SHEET_HORIZONTAL,
        zonesConfig: {},
      } as any)
      expect(result).toEqual(sampleTemplate)
      expect(mockPrisma.template.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Sales Sheet Horizontal',
            type: TemplateType.SALES_SHEET_HORIZONTAL,
          }),
        }),
      )
    })
  })

  describe('update', () => {
    it('updates a template when it exists', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(sampleTemplate)
      mockPrisma.template.update.mockResolvedValue({ ...sampleTemplate, name: 'Updated' })
      const result = await service.update('tpl-1', { name: 'Updated' })
      expect(result.name).toBe('Updated')
    })

    it('throws NotFoundException when template does not exist', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null)
      await expect(service.update('missing', { name: 'X' })).rejects.toThrow(NotFoundException)
    })
  })

  describe('remove', () => {
    it('deletes a template when it exists', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(sampleTemplate)
      mockPrisma.template.delete.mockResolvedValue(sampleTemplate)
      await expect(service.remove('tpl-1')).resolves.toEqual(sampleTemplate)
    })

    it('throws when template does not exist', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null)
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException)
    })
  })

  describe('addVariant', () => {
    it('throws when template does not exist', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null)
      await expect(
        service.addVariant('missing', { name: 'V1', zonesConfig: {} } as any),
      ).rejects.toThrow(NotFoundException)
    })

    it('creates variant when template exists', async () => {
      mockPrisma.template.findUnique.mockResolvedValue(sampleTemplate)
      const variant = { id: 'v1', templateId: 'tpl-1', name: 'V1', zonesConfig: {} }
      mockPrisma.templateVariant.create.mockResolvedValue(variant)
      await expect(
        service.addVariant('tpl-1', { name: 'V1', zonesConfig: {} } as any),
      ).resolves.toEqual(variant)
    })
  })
})
