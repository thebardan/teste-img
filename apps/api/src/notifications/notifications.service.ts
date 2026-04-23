import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { EventEmitter } from 'events'

export type NotificationType =
  | 'SUBMITTED_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED'

@Injectable()
export class NotificationsService {
  private readonly emitter = new EventEmitter()

  constructor(private prisma: PrismaClient) {
    this.emitter.setMaxListeners(0)
  }

  subscribe(userId: string, listener: (notif: any) => void): () => void {
    const handler = (payload: any) => {
      if (payload?.userId === userId) listener(payload)
    }
    this.emitter.on('notification', handler)
    return () => this.emitter.off('notification', handler)
  }

  async create(input: {
    userId: string
    type: NotificationType
    entityType: 'SalesSheet' | 'Presentation'
    entityId: string
    title: string
    message?: string
  }) {
    const notif = await this.prisma.notification.create({ data: input })
    this.emitter.emit('notification', notif)
    return notif
  }

  async listForUser(userId: string, opts?: { unreadOnly?: boolean; limit?: number }) {
    return this.prisma.notification.findMany({
      where: { userId, ...(opts?.unreadOnly ? { readAt: null } : {}) },
      orderBy: { createdAt: 'desc' },
      take: opts?.limit ?? 50,
    })
  }

  async countUnread(userId: string) {
    return this.prisma.notification.count({ where: { userId, readAt: null } })
  }

  async markRead(userId: string, id: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    })
  }

  async markAllRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    })
  }
}
