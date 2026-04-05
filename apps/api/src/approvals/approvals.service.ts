import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaClient, ApprovalStatus } from '@prisma/client'
import { AuditService } from './audit.service'

const SYSTEM_USER_EMAIL = 'admin@multilaser.com.br'

// Valid forward transitions
const TRANSITIONS: Record<ApprovalStatus, ApprovalStatus[]> = {
  DRAFT:     ['IN_REVIEW', 'ARCHIVED'],
  IN_REVIEW: ['APPROVED', 'REJECTED', 'ARCHIVED'],
  APPROVED:  ['ARCHIVED'],
  REJECTED:  ['DRAFT', 'IN_REVIEW', 'ARCHIVED'],
  ARCHIVED:  [],
}

@Injectable()
export class ApprovalsService {
  constructor(
    private prisma: PrismaClient,
    private audit: AuditService,
  ) {}

  private async getSystemUser() {
    const user = await this.prisma.user.findFirst({ where: { email: SYSTEM_USER_EMAIL } })
    if (!user) throw new Error('System user not found — run seed first')
    return user
  }

  // ─── Sales Sheet ────────────────────────────────────────────────────────────

  async getSalesSheetApprovals(id: string) {
    const [approvals, auditLogs] = await Promise.all([
      this.prisma.approval.findMany({
        where: { salesSheetId: id },
        include: { approver: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.audit.findForEntity('SalesSheet', id),
    ])
    return { approvals, auditLogs }
  }

  async submitSalesSheetForReview(id: string, comment?: string) {
    return this.transitionSalesSheet(id, 'IN_REVIEW', 'SUBMITTED_FOR_REVIEW', comment)
  }

  async approveSalesSheet(id: string, comment?: string) {
    return this.transitionSalesSheet(id, 'APPROVED', 'APPROVED', comment)
  }

  async rejectSalesSheet(id: string, comment?: string) {
    if (!comment?.trim()) throw new BadRequestException('Comment is required when rejecting')
    return this.transitionSalesSheet(id, 'REJECTED', 'REJECTED', comment)
  }

  async archiveSalesSheet(id: string) {
    return this.transitionSalesSheet(id, 'ARCHIVED', 'ARCHIVED')
  }

  private async transitionSalesSheet(
    id: string,
    targetStatus: ApprovalStatus,
    action: Parameters<AuditService['log']>[1],
    comment?: string,
  ) {
    const sheet = await this.prisma.salesSheet.findUnique({ where: { id } })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)

    const allowed = TRANSITIONS[sheet.status]
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${sheet.status} to ${targetStatus}`,
      )
    }

    const systemUser = await this.getSystemUser()

    const [updated] = await this.prisma.$transaction([
      this.prisma.salesSheet.update({
        where: { id },
        data: { status: targetStatus },
      }),
      this.prisma.approval.create({
        data: {
          salesSheetId: id,
          approverId: systemUser.id,
          status: targetStatus,
          comment: comment ?? null,
        },
      }),
    ])

    await this.audit.log(systemUser.id, action, 'SalesSheet', id, {
      from: sheet.status,
      to: targetStatus,
      comment,
    })

    return updated
  }

  // ─── Presentation ───────────────────────────────────────────────────────────

  async getPresentationApprovals(id: string) {
    const [approvals, auditLogs] = await Promise.all([
      this.prisma.approval.findMany({
        where: { presentationId: id },
        include: { approver: { select: { name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.audit.findForEntity('Presentation', id),
    ])
    return { approvals, auditLogs }
  }

  async submitPresentationForReview(id: string, comment?: string) {
    return this.transitionPresentation(id, 'IN_REVIEW', 'SUBMITTED_FOR_REVIEW', comment)
  }

  async approvePresentation(id: string, comment?: string) {
    return this.transitionPresentation(id, 'APPROVED', 'APPROVED', comment)
  }

  async rejectPresentation(id: string, comment?: string) {
    if (!comment?.trim()) throw new BadRequestException('Comment is required when rejecting')
    return this.transitionPresentation(id, 'REJECTED', 'REJECTED', comment)
  }

  async archivePresentation(id: string) {
    return this.transitionPresentation(id, 'ARCHIVED', 'ARCHIVED')
  }

  private async transitionPresentation(
    id: string,
    targetStatus: ApprovalStatus,
    action: Parameters<AuditService['log']>[1],
    comment?: string,
  ) {
    const presentation = await this.prisma.presentation.findUnique({ where: { id } })
    if (!presentation) throw new NotFoundException(`Presentation ${id} not found`)

    const allowed = TRANSITIONS[presentation.status]
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${presentation.status} to ${targetStatus}`,
      )
    }

    const systemUser = await this.getSystemUser()

    const [updated] = await this.prisma.$transaction([
      this.prisma.presentation.update({
        where: { id },
        data: { status: targetStatus },
      }),
      this.prisma.approval.create({
        data: {
          presentationId: id,
          approverId: systemUser.id,
          status: targetStatus,
          comment: comment ?? null,
        },
      }),
    ])

    await this.audit.log(systemUser.id, action, 'Presentation', id, {
      from: presentation.status,
      to: targetStatus,
      comment,
    })

    return updated
  }

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  async getPendingItems() {
    const [sheets, presentations] = await Promise.all([
      this.prisma.salesSheet.findMany({
        where: { status: 'IN_REVIEW' },
        include: {
          product: { select: { name: true } },
          author: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.presentation.findMany({
        where: { status: 'IN_REVIEW' },
        include: {
          client: { select: { name: true } },
          author: { select: { name: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ])
    return { sheets, presentations, total: sheets.length + presentations.length }
  }

  async getAllItems(status?: ApprovalStatus) {
    const where = status ? { status } : {}
    const [sheets, presentations] = await Promise.all([
      this.prisma.salesSheet.findMany({
        where,
        include: { product: { select: { name: true } }, author: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.presentation.findMany({
        where,
        include: { client: { select: { name: true } }, author: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
    ])
    return { sheets, presentations, total: sheets.length + presentations.length }
  }
}
