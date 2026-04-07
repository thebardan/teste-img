import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { ApprovalsService } from './approvals.service'
import { ApprovalStatus } from '@prisma/client'
import { ReviewActionDto } from './dto/review-action.dto'

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
  submitSalesSheet(@Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.service.submitSalesSheetForReview(id, dto.comment)
  }

  @Post('sales-sheet/:id/approve')
  approveSalesSheet(@Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.service.approveSalesSheet(id, dto.comment)
  }

  @Post('sales-sheet/:id/reject')
  rejectSalesSheet(@Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.service.rejectSalesSheet(id, dto.comment)
  }

  @Post('sales-sheet/:id/archive')
  archiveSalesSheet(@Param('id') id: string) {
    return this.service.archiveSalesSheet(id)
  }

  // ─── Presentation ───────────────────────────────────────────────────────────

  @Get('presentation/:id')
  getPresentationApprovals(@Param('id') id: string) {
    return this.service.getPresentationApprovals(id)
  }

  @Post('presentation/:id/submit')
  submitPresentation(@Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.service.submitPresentationForReview(id, dto.comment)
  }

  @Post('presentation/:id/approve')
  approvePresentation(@Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.service.approvePresentation(id, dto.comment)
  }

  @Post('presentation/:id/reject')
  rejectPresentation(@Param('id') id: string, @Body() dto: ReviewActionDto) {
    return this.service.rejectPresentation(id, dto.comment)
  }

  @Post('presentation/:id/archive')
  archivePresentation(@Param('id') id: string) {
    return this.service.archivePresentation(id)
  }
}
