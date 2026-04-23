import * as request from 'supertest'
import { NotificationsController } from '../src/notifications/notifications.controller'
import { NotificationsService } from '../src/notifications/notifications.service'
import { UsersService } from '../src/users/users.service'
import { bootstrap, close, makePrismaMock, stubUserResolution, TEST_EDITOR, SYSTEM_USER, type E2EContext } from './e2e-setup'

describe('E2E /api/notifications', () => {
  let ctx: E2EContext

  beforeEach(async () => {
    const prisma = makePrismaMock()
    stubUserResolution(prisma, [SYSTEM_USER, TEST_EDITOR])
    ctx = await bootstrap({
      controllers: [NotificationsController],
      providers: [NotificationsService, UsersService],
      prisma,
    })
  })

  afterEach(async () => {
    await close(ctx)
  })

  const header = { 'x-user-email': TEST_EDITOR.email, 'x-user-role': TEST_EDITOR.role }

  it('GET /notifications returns user notifications', async () => {
    ctx.prisma.notification.findMany.mockResolvedValue([
      { id: 'n-1', type: 'REJECTED', title: 'Rejected X', readAt: null },
      { id: 'n-2', type: 'APPROVED', title: 'Approved Y', readAt: new Date().toISOString() },
    ])
    const res = await request(ctx.app.getHttpServer())
      .get('/api/notifications')
      .set(header)
      .expect(200)
    expect(res.body.items).toHaveLength(2)
  })

  it('GET /notifications?unreadOnly=true filters by readAt=null', async () => {
    ctx.prisma.notification.findMany.mockResolvedValue([])
    await request(ctx.app.getHttpServer())
      .get('/api/notifications?unreadOnly=true')
      .set(header)
      .expect(200)
    expect(ctx.prisma.notification.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ readAt: null }),
    }))
  })

  it('GET /notifications/unread-count returns count', async () => {
    ctx.prisma.notification.count.mockResolvedValue(5)
    const res = await request(ctx.app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set(header)
      .expect(200)
    expect(res.body.count).toBe(5)
  })

  it('POST /notifications/:id/read marks single notification read', async () => {
    ctx.prisma.notification.updateMany.mockResolvedValue({ count: 1 })
    const res = await request(ctx.app.getHttpServer())
      .post('/api/notifications/n-1/read')
      .set(header)
      .expect(201)
    expect(res.body.updated).toBe(true)
    expect(ctx.prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { id: 'n-1', userId: TEST_EDITOR.id, readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })

  it('POST /notifications/:id/read 404 when not found', async () => {
    ctx.prisma.notification.updateMany.mockResolvedValue({ count: 0 })
    await request(ctx.app.getHttpServer())
      .post('/api/notifications/missing/read')
      .set(header)
      .expect(404)
  })

  it('POST /notifications/read-all marks all unread as read', async () => {
    ctx.prisma.notification.updateMany.mockResolvedValue({ count: 7 })
    const res = await request(ctx.app.getHttpServer())
      .post('/api/notifications/read-all')
      .set(header)
      .expect(201)
    expect(res.body.updated).toBe(7)
  })

  it('auto-provisions user on first call (unknown email)', async () => {
    const prismaCall = ctx.prisma.notification.count.mock
    ctx.prisma.notification.count.mockResolvedValue(0)
    await request(ctx.app.getHttpServer())
      .get('/api/notifications/unread-count')
      .set({ 'x-user-email': 'novo@multilaser.com.br', 'x-user-role': 'VIEWER' })
      .expect(200)
    expect(ctx.prisma.user.upsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: 'novo@multilaser.com.br' },
    }))
  })
})
