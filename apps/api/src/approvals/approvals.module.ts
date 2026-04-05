import { Module } from '@nestjs/common'
import { ApprovalsController } from './approvals.controller'
import { ApprovalsService } from './approvals.service'
import { AuditService } from './audit.service'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule],
  controllers: [ApprovalsController],
  providers: [ApprovalsService, AuditService],
  exports: [ApprovalsService, AuditService],
})
export class ApprovalsModule {}
