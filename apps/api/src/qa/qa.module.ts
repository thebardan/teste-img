import { Module } from '@nestjs/common'
import { QAController } from './qa.controller'
import { QAService } from './qa.service'
import { AiModule } from '../ai/ai.module'
import { DatabaseModule } from '../database/database.module'

@Module({
  imports: [DatabaseModule, AiModule],
  controllers: [QAController],
  providers: [QAService],
  exports: [QAService],
})
export class QAModule {}
