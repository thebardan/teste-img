import { Module } from '@nestjs/common'
import { BrandGovernanceService } from './brand-governance.service'
import { BrandGovernanceController } from './brand-governance.controller'

@Module({
  providers: [BrandGovernanceService],
  controllers: [BrandGovernanceController],
  exports: [BrandGovernanceService],
})
export class BrandGovernanceModule {}
