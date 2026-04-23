import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export type NotificationType =
  | 'SUBMITTED_FOR_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'ARCHIVED'

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaClient) {}

  async create(input: {
    userId: string
    type: NotificationType
    entityType: 'SalesSheet' | 'Presentation'
    entityId: string
    title: string
    message?: string
  }) {
    return this.prisma.notification.create({ data: input })
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
