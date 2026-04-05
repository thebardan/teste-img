import { Injectable } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

export type AuditAction =
  | 'STATUS_CHANGE'
  | 'APPROVED'
  | 'REJECTED'
  | 'SUBMITTED_FOR_REVIEW'
  | 'ARCHIVED'
  | 'CREATED'
  | 'EXPORTED'

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaClient) {}

  async log(
    userId: string,
    action: AuditAction,
    entityType: 'SalesSheet' | 'Presentation',
    entityId: string,
    metadata?: Record<string, any>,
  ) {
    return this.prisma.auditLog.create({
      data: { userId, action, entityType, entityId, metadata: metadata ?? {} },
    })
  }

  findForEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }
}
