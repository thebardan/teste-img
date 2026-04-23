import { NotificationsService } from './notifications.service'

const mockPrisma = {
  notification: {
    create: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    updateMany: jest.fn(),
  },
}

describe('NotificationsService', () => {
  let service: NotificationsService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new NotificationsService(mockPrisma as any)
  })

  it('creates notification and emits subscribe event', async () => {
    const notif = { id: 'n-1', userId: 'u-1', type: 'REJECTED', title: 'T' }
    mockPrisma.notification.create.mockResolvedValue(notif)

    const received: any[] = []
    const unsubscribe = service.subscribe('u-1', (n) => received.push(n))

    await service.create({
      userId: 'u-1',
      type: 'REJECTED',
      entityType: 'SalesSheet',
      entityId: 'ss-1',
      title: 'T',
    })

    expect(received).toHaveLength(1)
    expect(received[0].id).toBe('n-1')
    unsubscribe()
  })

  it('does not deliver notification to different user subscriber', async () => {
    const notif = { id: 'n-1', userId: 'u-1' }
    mockPrisma.notification.create.mockResolvedValue(notif)

    const received: any[] = []
    service.subscribe('u-2', (n) => received.push(n))

    await service.create({
      userId: 'u-1',
      type: 'APPROVED',
      entityType: 'Presentation',
      entityId: 'p-1',
      title: 'T',
    })

    expect(received).toHaveLength(0)
  })

  it('unsubscribe stops receiving events', async () => {
    mockPrisma.notification.create.mockResolvedValue({ id: 'n-1', userId: 'u-1' })

    const received: any[] = []
    const unsub = service.subscribe('u-1', (n) => received.push(n))
    unsub()
    await service.create({
      userId: 'u-1',
      type: 'REJECTED',
      entityType: 'SalesSheet',
      entityId: 'ss-1',
      title: 'T',
    })

    expect(received).toHaveLength(0)
  })

  it('countUnread delegates to prisma with readAt=null', async () => {
    mockPrisma.notification.count.mockResolvedValue(3)
    const count = await service.countUnread('u-1')
    expect(count).toBe(3)
    expect(mockPrisma.notification.count).toHaveBeenCalledWith({ where: { userId: 'u-1', readAt: null } })
  })

  it('markAllRead sets readAt for all unread', async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 5 })
    await service.markAllRead('u-1')
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 'u-1', readAt: null },
      data: { readAt: expect.any(Date) },
    })
  })
})
