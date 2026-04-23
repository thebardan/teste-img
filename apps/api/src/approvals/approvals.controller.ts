import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApprovalsService } from './approvals.service'
import { ApprovalStatus } from '@prisma/client'
import { ReviewActionDto } from './dto/review-action.dto'
import { CurrentUser, type RequestUser } from '../auth/current-user.decorator'

@Controller('approvals')
export class ApprovalsController {
  constructor(private readonly service: ApprovalsService) {}

  // ─── Dashboard ──────────────────────────────────────────────────────────────

  @Get('pending')
  getPending() {
    return this.service.getPendingItems()
  }

  @Get()
  getAll(@Query('status') status?: ApprovalStatus) {
    return this.service.getAllItems(status)
  }

  // ─── Sales Sheet ────────────────────────────────────────────────────────────

  @Get('sales-sheet/:id')
  getSalesSheetApprovals(@Param('id') id: string) {
    return this.service.getSalesSheetApprovals(id)
  }

  @Post('sales-sheet/:id/submit')
  submitSalesSheet(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() caller: RequestUser | null,
  ) {
    return this.service.submitSalesSheetForReview(id, {
      callerEmail: caller?.email,
      comment: dto.comment,
      annotations: dto.annotations,
    })
  }

  @Post('sales-sheet/:id/approve')
  approveSalesSheet(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() caller: RequestUser | null,
  ) {
    return this.service.approveSalesSheet(id, {
      callerEmail: caller?.email,
      comment: dto.comment,
      annotations: dto.annotations,
    })
  }

  @Post('sales-sheet/:id/reject')
  rejectSalesSheet(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() caller: RequestUser | null,
  ) {
    return this.service.rejectSalesSheet(id, {
      callerEmail: caller?.email,
      comment: dto.comment,
      annotations: dto.annotations,
    })
  }

  @Post('sales-sheet/:id/archive')
  archiveSalesSheet(
    @Param('id') id: string,
    @CurrentUser() caller: RequestUser | null,
  ) {
    return this.service.archiveSalesSheet(id, { callerEmail: caller?.email })
  }

  // ─── Presentation ───────────────────────────────────────────────────────────

  @Get('presentation/:id')
  getPresentationApprovals(@Param('id') id: string) {
    return this.service.getPresentationApprovals(id)
  }

  @Post('presentation/:id/submit')
  submitPresentation(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() caller: RequestUser | null,
  ) {
    return this.service.submitPresentationForReview(id, {
      callerEmail: caller?.email,
      comment: dto.comment,
      annotations: dto.annotations,
    })
  }

  @Post('presentation/:id/approve')
  approvePresentation(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() caller: RequestUser | null,
  ) {
    return this.service.approvePresentation(id, {
      callerEmail: caller?.email,
      comment: dto.comment,
      annotations: dto.annotations,
    })
  }

  @Post('presentation/:id/reject')
  rejectPresentation(
    @Param('id') id: string,
    @Body() dto: ReviewActionDto,
    @CurrentUser() caller: RequestUser | null,
  ) {
    return this.service.rejectPresentation(id, {
      callerEmail: caller?.email,
      comment: dto.comment,
      annotations: dto.annotations,
    })
  }

  @Post('presentation/:id/archive')
  archivePresentation(
    @Param('id') id: string,
    @CurrentUser() caller: RequestUser | null,
  ) {
    return this.service.archivePresentation(id, { callerEmail: caller?.email })
  }
}
