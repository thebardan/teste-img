import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaClient, ApprovalStatus } from '@prisma/client'
import { AuditService } from './audit.service'
import { UsersService } from '../users/users.service'
import { NotificationsService, NotificationType } from '../notifications/notifications.service'

export interface Annotation {
  targetField?: string
  targetSlideOrder?: number
  comment: string
}

export interface TransitionInput {
  callerEmail?: string | null
  comment?: string
  annotations?: Annotation[]
}

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
    private users: UsersService,
    private notifications: NotificationsService,
  ) {}

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

  submitSalesSheetForReview(id: string, input: TransitionInput = {}) {
    return this.transitionSalesSheet(id, 'IN_REVIEW', 'SUBMITTED_FOR_REVIEW', input)
  }

  approveSalesSheet(id: string, input: TransitionInput = {}) {
    return this.transitionSalesSheet(id, 'APPROVED', 'APPROVED', input)
  }

  rejectSalesSheet(id: string, input: TransitionInput = {}) {
    const hasComment = !!input.comment?.trim()
    const hasAnnotations = (input.annotations ?? []).some((a) => a.comment?.trim())
    if (!hasComment && !hasAnnotations) {
      throw new BadRequestException('Comment or annotations required when rejecting')
    }
    return this.transitionSalesSheet(id, 'REJECTED', 'REJECTED', input)
  }

  archiveSalesSheet(id: string, input: TransitionInput = {}) {
    return this.transitionSalesSheet(id, 'ARCHIVED', 'ARCHIVED', input)
  }

  private async transitionSalesSheet(
    id: string,
    targetStatus: ApprovalStatus,
    action: Parameters<AuditService['log']>[1],
    input: TransitionInput,
  ) {
    const sheet = await this.prisma.salesSheet.findUnique({ where: { id } })
    if (!sheet) throw new NotFoundException(`SalesSheet ${id} not found`)

    const allowed = TRANSITIONS[sheet.status]
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${sheet.status} to ${targetStatus}`,
      )
    }

    const caller = await this.users.resolveCaller(input.callerEmail)

    // Auto-snapshot: when rejection happens or review starts, freeze current content as new version
    // so subsequent edits create a clean diff against the submitted state.
    if (targetStatus === 'REJECTED' || targetStatus === 'IN_REVIEW' || targetStatus === 'APPROVED') {
      await this.snapshotSalesSheetIfChanged(id)
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.salesSheet.update({
        where: { id },
        data: { status: targetStatus },
      }),
      this.prisma.approval.create({
        data: {
          salesSheetId: id,
          approverId: caller.id,
          status: targetStatus,
          comment: input.comment ?? null,
          annotations: (input.annotations ?? []) as any,
        },
      }),
    ])

    await this.audit.log(caller.id, action, 'SalesSheet', id, {
      from: sheet.status,
      to: targetStatus,
      comment: input.comment,
      annotations: input.annotations,
    })

    await this.notifyAuthor({
      authorId: sheet.authorId,
      callerId: caller.id,
      entityType: 'SalesSheet',
      entityId: id,
      title: sheet.title,
      targetStatus,
      comment: input.comment,
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

  submitPresentationForReview(id: string, input: TransitionInput = {}) {
    return this.transitionPresentation(id, 'IN_REVIEW', 'SUBMITTED_FOR_REVIEW', input)
  }

  approvePresentation(id: string, input: TransitionInput = {}) {
    return this.transitionPresentation(id, 'APPROVED', 'APPROVED', input)
  }

  rejectPresentation(id: string, input: TransitionInput = {}) {
    const hasComment = !!input.comment?.trim()
    const hasAnnotations = (input.annotations ?? []).some((a) => a.comment?.trim())
    if (!hasComment && !hasAnnotations) {
      throw new BadRequestException('Comment or annotations required when rejecting')
    }
    return this.transitionPresentation(id, 'REJECTED', 'REJECTED', input)
  }

  archivePresentation(id: string, input: TransitionInput = {}) {
    return this.transitionPresentation(id, 'ARCHIVED', 'ARCHIVED', input)
  }

  private async transitionPresentation(
    id: string,
    targetStatus: ApprovalStatus,
    action: Parameters<AuditService['log']>[1],
    input: TransitionInput,
  ) {
    const presentation = await this.prisma.presentation.findUnique({ where: { id } })
    if (!presentation) throw new NotFoundException(`Presentation ${id} not found`)

    const allowed = TRANSITIONS[presentation.status]
    if (!allowed.includes(targetStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${presentation.status} to ${targetStatus}`,
      )
    }

    const caller = await this.users.resolveCaller(input.callerEmail)

    if (targetStatus === 'REJECTED' || targetStatus === 'IN_REVIEW' || targetStatus === 'APPROVED') {
      await this.snapshotPresentationIfChanged(id)
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.presentation.update({
        where: { id },
        data: { status: targetStatus },
      }),
      this.prisma.approval.create({
        data: {
          presentationId: id,
          approverId: caller.id,
          status: targetStatus,
          comment: input.comment ?? null,
          annotations: (input.annotations ?? []) as any,
        },
      }),
    ])

    await this.audit.log(caller.id, action, 'Presentation', id, {
      from: presentation.status,
      to: targetStatus,
      comment: input.comment,
      annotations: input.annotations,
    })

    await this.notifyAuthor({
      authorId: presentation.authorId,
      callerId: caller.id,
      entityType: 'Presentation',
      entityId: id,
      title: presentation.title,
      targetStatus,
      comment: input.comment,
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

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async snapshotSalesSheetIfChanged(salesSheetId: string) {
    const versions = await this.prisma.salesSheetVersion.findMany({
      where: { salesSheetId },
      orderBy: { versionNumber: 'desc' },
      take: 2,
    })
    const latest = versions[0]
    if (!latest) return
    const prev = versions[1]
    const same = prev && JSON.stringify(prev.content) === JSON.stringify(latest.content)
    if (same) return
    // Snapshot: clone latest content into a new version. Next edits mutate this new row.
    await this.prisma.salesSheetVersion.create({
      data: {
        salesSheetId,
        versionNumber: latest.versionNumber + 1,
        content: latest.content as any,
      },
    })
  }

  private async snapshotPresentationIfChanged(presentationId: string) {
    const versions = await this.prisma.presentationVersion.findMany({
      where: { presentationId },
      orderBy: { versionNumber: 'desc' },
      take: 2,
      include: { slides: { orderBy: { order: 'asc' } } },
    })
    const latest = versions[0]
    if (!latest) return
    const prev = versions[1]
    const same =
      prev &&
      JSON.stringify(prev.slides.map((s) => ({ order: s.order, content: s.content }))) ===
        JSON.stringify(latest.slides.map((s) => ({ order: s.order, content: s.content })))
    if (same) return
    await this.prisma.presentationVersion.create({
      data: {
        presentationId,
        versionNumber: latest.versionNumber + 1,
        slides: {
          create: latest.slides.map((s) => ({ order: s.order, content: s.content as any })),
        },
      },
    })
  }

  private async notifyAuthor(args: {
    authorId: string
    callerId: string
    entityType: 'SalesSheet' | 'Presentation'
    entityId: string
    title: string
    targetStatus: ApprovalStatus
    comment?: string
  }) {
    if (args.authorId === args.callerId) return // no self-notifications
    const typeMap: Partial<Record<ApprovalStatus, NotificationType>> = {
      IN_REVIEW: 'SUBMITTED_FOR_REVIEW',
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      ARCHIVED: 'ARCHIVED',
    }
    const notifType = typeMap[args.targetStatus]
    if (!notifType) return
    const labels: Record<NotificationType, string> = {
      SUBMITTED_FOR_REVIEW: 'Enviado para revisão',
      APPROVED: 'Aprovado',
      REJECTED: 'Revisão solicitada',
      ARCHIVED: 'Arquivado',
    }
    await this.notifications.create({
      userId: args.authorId,
      type: notifType,
      entityType: args.entityType,
      entityId: args.entityId,
      title: `${labels[notifType]}: ${args.title}`,
      message: args.comment ?? undefined,
    })
  }
}
