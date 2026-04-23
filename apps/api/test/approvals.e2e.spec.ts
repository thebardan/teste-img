import * as request from 'supertest'
import { ApprovalsController } from '../src/approvals/approvals.controller'
import { ApprovalsService } from '../src/approvals/approvals.service'
import { AuditService } from '../src/approvals/audit.service'
import { UsersService } from '../src/users/users.service'
import { NotificationsService } from '../src/notifications/notifications.service'
import { bootstrap, close, makePrismaMock, stubUserResolution, TEST_EDITOR, TEST_APPROVER, SYSTEM_USER, type E2EContext } from './e2e-setup'

describe('E2E /api/approvals', () => {
  let ctx: E2EContext

  beforeEach(async () => {
    const prisma = makePrismaMock()
    stubUserResolution(prisma, [SYSTEM_USER, TEST_EDITOR, TEST_APPROVER])
    ctx = await bootstrap({
      controllers: [ApprovalsController],
      providers: [ApprovalsService, AuditService, UsersService, NotificationsService],
      prisma,
    })
  })

  afterEach(async () => {
    await close(ctx)
  })

  function header(email = TEST_APPROVER.email) {
    return { 'x-user-email': email, 'x-user-role': 'APPROVER' }
  }

  // ─── Sales Sheet ────────────────────────────────────────────────────────────

  describe('POST /approvals/sales-sheet/:id/submit', () => {
    it('transitions DRAFT → IN_REVIEW', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1', status: 'DRAFT', authorId: TEST_EDITOR.id, title: 'Sheet',
      })
      ctx.prisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'IN_REVIEW' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      ctx.prisma.salesSheetVersion.findMany.mockResolvedValue([])

      const res = await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/submit')
        .set(header(TEST_EDITOR.email))
        .send({ comment: 'pronto p/ revisão' })
        .expect(201)

      expect(res.body.status).toBe('IN_REVIEW')
      expect(ctx.prisma.approval.create).toHaveBeenCalled()
    })

    it('rejects invalid transition APPROVED → IN_REVIEW', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1', status: 'APPROVED', authorId: TEST_EDITOR.id, title: 'Sheet',
      })
      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/submit')
        .set(header())
        .send({})
        .expect(400)
    })

    it('404 for missing sheet', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue(null)
      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/missing/submit')
        .set(header())
        .send({})
        .expect(404)
    })
  })

  describe('POST /approvals/sales-sheet/:id/reject', () => {
    const inReview = { id: 'ss-1', status: 'IN_REVIEW', authorId: TEST_EDITOR.id, title: 'Sheet' }

    it('400 when no comment and no annotations', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue(inReview)
      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/reject')
        .set(header())
        .send({})
        .expect(400)
    })

    it('accepts annotations without comment', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue(inReview)
      ctx.prisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'REJECTED' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      ctx.prisma.salesSheetVersion.findMany.mockResolvedValue([])

      const res = await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/reject')
        .set(header())
        .send({ annotations: [{ targetField: 'headline', comment: 'trocar' }] })
        .expect(201)

      expect(res.body.status).toBe('REJECTED')
      const approvalCreateCall = ctx.prisma.approval.create.mock.calls[0][0]
      expect(approvalCreateCall.data.annotations).toEqual([{ targetField: 'headline', comment: 'trocar' }])
    })

    it('attributes approver to header user, not system fallback', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue(inReview)
      ctx.prisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'REJECTED' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      ctx.prisma.salesSheetVersion.findMany.mockResolvedValue([])

      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/reject')
        .set(header(TEST_APPROVER.email))
        .send({ comment: 'x' })
        .expect(201)

      const call = ctx.prisma.approval.create.mock.calls[0][0]
      expect(call.data.approverId).toBe(TEST_APPROVER.id)
    })

    it('creates REJECTED notification for author', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue(inReview)
      ctx.prisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'REJECTED' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      ctx.prisma.notification.create.mockResolvedValue({ id: 'n-1' })
      ctx.prisma.salesSheetVersion.findMany.mockResolvedValue([])

      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/reject')
        .set(header(TEST_APPROVER.email))
        .send({ comment: 'ajustar' })
        .expect(201)

      expect(ctx.prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: TEST_EDITOR.id,
          type: 'REJECTED',
          entityType: 'SalesSheet',
          entityId: 'ss-1',
        }),
      }))
    })

    it('auto-snapshots before REJECTED when content changed', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue(inReview)
      ctx.prisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'REJECTED' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      ctx.prisma.salesSheetVersion.findMany.mockResolvedValue([
        { id: 'v2', versionNumber: 2, content: { headline: 'B' } },
        { id: 'v1', versionNumber: 1, content: { headline: 'A' } },
      ])
      ctx.prisma.salesSheetVersion.create.mockResolvedValue({ id: 'v3', versionNumber: 3 })

      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/reject')
        .set(header())
        .send({ comment: 'x' })
        .expect(201)

      expect(ctx.prisma.salesSheetVersion.create).toHaveBeenCalled()
    })

    it('skips snapshot when content unchanged', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue(inReview)
      ctx.prisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'REJECTED' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      const sameContent = { headline: 'A' }
      ctx.prisma.salesSheetVersion.findMany.mockResolvedValue([
        { id: 'v2', versionNumber: 2, content: sameContent },
        { id: 'v1', versionNumber: 1, content: sameContent },
      ])

      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/reject')
        .set(header())
        .send({ comment: 'x' })
        .expect(201)

      expect(ctx.prisma.salesSheetVersion.create).not.toHaveBeenCalled()
    })
  })

  describe('POST /approvals/sales-sheet/:id/approve', () => {
    it('transitions IN_REVIEW → APPROVED and notifies author', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1', status: 'IN_REVIEW', authorId: TEST_EDITOR.id, title: 'Sheet',
      })
      ctx.prisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'APPROVED' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      ctx.prisma.notification.create.mockResolvedValue({ id: 'n-1' })
      ctx.prisma.salesSheetVersion.findMany.mockResolvedValue([])

      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/approve')
        .set(header(TEST_APPROVER.email))
        .send({})
        .expect(201)

      expect(ctx.prisma.notification.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ type: 'APPROVED' }),
      }))
    })

    it('no self-notification when caller is author', async () => {
      ctx.prisma.salesSheet.findUnique.mockResolvedValue({
        id: 'ss-1', status: 'IN_REVIEW', authorId: TEST_APPROVER.id, title: 'Sheet',
      })
      ctx.prisma.salesSheet.update.mockResolvedValue({ id: 'ss-1', status: 'APPROVED' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      ctx.prisma.salesSheetVersion.findMany.mockResolvedValue([])

      await request(ctx.app.getHttpServer())
        .post('/api/approvals/sales-sheet/ss-1/approve')
        .set(header(TEST_APPROVER.email))
        .send({})
        .expect(201)

      expect(ctx.prisma.notification.create).not.toHaveBeenCalled()
    })
  })

  describe('GET /approvals', () => {
    it('lists all items with counts', async () => {
      ctx.prisma.salesSheet.findMany.mockResolvedValue([{ id: 'ss-1' }])
      ctx.prisma.presentation.findMany.mockResolvedValue([{ id: 'p-1' }, { id: 'p-2' }])

      const res = await request(ctx.app.getHttpServer())
        .get('/api/approvals')
        .set(header())
        .expect(200)

      expect(res.body.total).toBe(3)
    })

    it('filters by status', async () => {
      ctx.prisma.salesSheet.findMany.mockResolvedValue([])
      ctx.prisma.presentation.findMany.mockResolvedValue([])

      await request(ctx.app.getHttpServer())
        .get('/api/approvals?status=APPROVED')
        .set(header())
        .expect(200)

      expect(ctx.prisma.salesSheet.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: 'APPROVED' },
      }))
    })
  })

  describe('GET /approvals/pending', () => {
    it('returns only IN_REVIEW items', async () => {
      ctx.prisma.salesSheet.findMany.mockResolvedValue([{ id: 'ss-1' }])
      ctx.prisma.presentation.findMany.mockResolvedValue([])

      const res = await request(ctx.app.getHttpServer())
        .get('/api/approvals/pending')
        .set(header())
        .expect(200)

      expect(res.body.total).toBe(1)
      expect(ctx.prisma.salesSheet.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { status: 'IN_REVIEW' },
      }))
    })
  })

  describe('Presentation endpoints', () => {
    it('POST /presentation/:id/approve', async () => {
      ctx.prisma.presentation.findUnique.mockResolvedValue({
        id: 'p-1', status: 'IN_REVIEW', authorId: TEST_EDITOR.id, title: 'Deck',
      })
      ctx.prisma.presentation.update.mockResolvedValue({ id: 'p-1', status: 'APPROVED' })
      ctx.prisma.approval.create.mockResolvedValue({ id: 'appr-1' })
      ctx.prisma.presentationVersion.findMany.mockResolvedValue([])
      ctx.prisma.notification.create.mockResolvedValue({ id: 'n-1' })

      await request(ctx.app.getHttpServer())
        .post('/api/approvals/presentation/p-1/approve')
        .set(header(TEST_APPROVER.email))
        .send({})
        .expect(201)

      expect(ctx.prisma.approval.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          presentationId: 'p-1',
          approverId: TEST_APPROVER.id,
        }),
      }))
    })

    it('POST /presentation/:id/reject requires comment or annotations', async () => {
      ctx.prisma.presentation.findUnique.mockResolvedValue({
        id: 'p-1', status: 'IN_REVIEW', authorId: TEST_EDITOR.id, title: 'Deck',
      })
      await request(ctx.app.getHttpServer())
        .post('/api/approvals/presentation/p-1/reject')
        .set(header())
        .send({})
        .expect(400)
    })
  })
})
