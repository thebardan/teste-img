import { Module } from '@nestjs/common'
import { PresentationsController } from './presentations.controller'
import { PresentationsService } from './presentations.service'
import { AiModule } from '../ai/ai.module'

@Module({
  imports: [AiModule],
  controllers: [PresentationsController],
  providers: [PresentationsService],
  exports: [PresentationsService],
})
export class PresentationsModule {}
