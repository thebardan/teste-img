import { NotFoundException } from '@nestjs/common'
import { ExportsService } from './exports.service'

const mockPptxComposer = {
  compose: jest.fn().mockResolvedValue(Buffer.from('pptx-content')),
}

const mockPdfComposer = {
  composeSalesSheet: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
  composePresentation: jest.fn().mockResolvedValue(Buffer.from('pdf-content')),
}

const mockStorage = {
  upload: jest.fn().mockImplementation((key) => Promise.resolve(key)),
  getPresignedUrl: jest.fn().mockResolvedValue('https://cdn.example.com/download'),
  validateUpload: jest.fn(),
}

const mockPrisma = {
  presentation: { findUnique: jest.fn() },
  salesSheet: { findUnique: jest.fn() },
  exportedArtifact: {
    create: jest.fn(),
    findUnique: jest.fn(),
  },
}

describe('ExportsService', () => {
  let service: ExportsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new ExportsService(
      mockPrisma as any,
      mockStorage as any,
      mockPptxComposer as any,
      mockPdfComposer as any,
    )
  })

  describe('exportPresentationPptx', () => {
    const mockPresentation = {
      id: 'pres-1',
      title: 'Proposta Walmart',
      versions: [
        {
          id: 'ver-1',
          versionNumber: 1,
          slides: [
            { order: 1, content: { type: 'cover', title: 'Cover' } },
            { order: 2, content: { type: 'context', title: 'Contexto' } },
            { order: 3, content: { type: 'products', title: 'Produtos' } },
            { order: 4, content: { type: 'benefits', title: 'Benefícios' } },
            { order: 5, content: { type: 'closing', title: 'Fechamento' } },
          ],
        },
      ],
    }

    it('generates a PPTX and stores the artifact', async () => {
      mockPrisma.presentation.findUnique.mockResolvedValue(mockPresentation)
      mockPrisma.exportedArtifact.create.mockResolvedValue({
        id: 'art-1',
        type: 'PPTX',
        storageKey: 'exports/presentations/pres-1/proposta-walmart-v1.pptx',
        filename: 'proposta-walmart-v1.pptx',
        sizeBytes: 12,
      })

      const result = await service.exportPresentationPptx('pres-1')

      expect(mockPptxComposer.compose).toHaveBeenCalledWith(
        'Proposta Walmart',
        expect.arrayContaining([expect.objectContaining({ order: 1 })]),
      )
      expect(mockStorage.upload).toHaveBeenCalledWith(
        expect.stringContaining('pres-1'),
        expect.any(Buffer),
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      )
      expect(result.artifact).toBeDefined()
    })

    it('throws NotFoundException when presentation not found', async () => {
      mockPrisma.presentation.findUnique.mockResolvedValue(null)
      await expect(service.exportPresentationPptx('missing')).rejects.toThrow(NotFoundException)
    })

    it('throws NotFoundException when presentation has no versions', async () => {
      mockPrisma.presentation.findUnique.mockResolvedValue({
        ...mockPresentation,
        versions: [],
      })
      await expect(service.exportPresentationPptx('pres-1')).rejects.toThrow(NotFoundException)
    })
  })
})
