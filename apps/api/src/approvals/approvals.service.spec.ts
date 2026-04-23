import { BadRequestException, NotFoundException } from '@nestjs/common'
import { ApprovalsService } from './approvals.service'

const mockCaller = { id: 'user-real', email: 'editor@multilaser.com.br', name: 'Editor' }
const mockAuthor = { id: 'user-author', email: 'author@multilaser.com.br', name: 'Author' }

function makePrisma() {
  return {
    salesSheet: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW' }),
    },
    presentation: {
      findUnique: jest.fn(),
      update: jest.fn().mockResolvedValue({ id: 'pres-1', status: 'IN_REVIEW' }),
    },
    approval: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'appr-1' }),
    },
    salesSheetVersion: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'v-1' }),
    },
    presentationVersion: {
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'pv-1' }),
    },
    $transaction: jest.fn((ops: Promise<any>[]) => Promise.all(ops)),
  }
}

const mockAudit = {
  log: jest.fn().mockResolvedValue(undefined),
  findForEntity: jest.fn().mockResolvedValue([]),
}

const mockUsers = {
  resolveCaller: jest.fn().mockResolvedValue(mockCaller),
  getSystemUser: jest.fn().mockResolvedValue(mockCaller),
}

const mockNotifications = {
  create: jest.fn().mockResolvedValue({ id: 'n-1' }),
}

describe('ApprovalsService', () => {
  let service: ApprovalsService
  let prisma: ReturnType<typeof makePrisma>

  beforeEach(() => {
    jest.clearAllMocks()
    prisma = makePrisma()
    service = new ApprovalsService(
      prisma as any,
      mockAudit as any,
      mockUsers as any,
      mockNotifications as any,
    )
  })

  describe('rejectSalesSheet', () => {
    it('throws when no comment and no annotations', () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'T' })
      expect(() => service.rejectSalesSheet('ss-1', {})).toThrow(BadRequestException)
    })

    it('accepts annotations without top-level comment', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'T' })
      await service.rejectSalesSheet('ss-1', {
        annotations: [{ targetField: 'headline', comment: 'refazer' }],
      })
      expect(prisma.approval.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          annotations: [{ targetField: 'headline', comment: 'refazer' }],
        }),
      }))
    })

    it('persists comment + annotations in Approval row', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'T' })
      await service.rejectSalesSheet('ss-1', {
        comment: 'geral ruim',
        annotations: [{ targetField: 'cta', comment: 'muito genérico' }],
      })
      expect(prisma.approval.create).toHaveBeenCalled()
      const call = prisma.approval.create.mock.calls[0][0]
      expect(call.data.comment).toBe('geral ruim')
      expect(call.data.annotations).toEqual([{ targetField: 'cta', comment: 'muito genérico' }])
    })

    it('attributes approverId to resolved caller, not system user hardcode', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'T' })
      await service.rejectSalesSheet('ss-1', {
        callerEmail: 'editor@multilaser.com.br',
        comment: 'x',
      })
      expect(mockUsers.resolveCaller).toHaveBeenCalledWith('editor@multilaser.com.br')
      const call = prisma.approval.create.mock.calls[0][0]
      expect(call.data.approverId).toBe(mockCaller.id)
    })

    it('creates REJECTED notification for author', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'My Sheet' })
      await service.rejectSalesSheet('ss-1', { comment: 'x' })
      expect(mockNotifications.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: mockAuthor.id,
        type: 'REJECTED',
        entityType: 'SalesSheet',
        entityId: 'ss-1',
      }))
    })

    it('does not notify when author is the caller', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW', authorId: mockCaller.id, title: 'T' })
      await service.rejectSalesSheet('ss-1', { callerEmail: mockCaller.email, comment: 'x' })
      expect(mockNotifications.create).not.toHaveBeenCalled()
    })

    it('rejects invalid transition', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'DRAFT', authorId: mockAuthor.id, title: 'T' })
      await expect(service.rejectSalesSheet('ss-1', { comment: 'x' })).rejects.toThrow(BadRequestException)
    })

    it('404 when sheet not found', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue(null)
      await expect(service.rejectSalesSheet('missing', { comment: 'x' })).rejects.toThrow(NotFoundException)
    })
  })

  describe('approveSalesSheet', () => {
    it('allows no comment on approve', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'T' })
      await expect(service.approveSalesSheet('ss-1', {})).resolves.toBeDefined()
    })

    it('creates APPROVED notification', async () => {
      prisma.salesSheet.findUnique.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'T' })
      await service.approveSalesSheet('ss-1', {})
      expect(mockNotifications.create).toHaveBeenCalledWith(expect.objectContaining({ type: 'APPROVED' }))
    })
  })

  describe('Presentation transitions', () => {
    it('rejects require comment or annotations', () => {
      prisma.presentation.findUnique.mockResolvedValue({ id: 'p-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'T' })
      expect(() => service.rejectPresentation('p-1', {})).toThrow(BadRequestException)
    })

    it('approvePresentation creates approval row', async () => {
      prisma.presentation.findUnique.mockResolvedValue({ id: 'p-1', status: 'IN_REVIEW', authorId: mockAuthor.id, title: 'T' })
      await service.approvePresentation('p-1', {})
      expect(prisma.approval.create).toHaveBeenCalled()
    })
  })
})
