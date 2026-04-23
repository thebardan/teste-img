import { Controller, Get, Param } from '@nestjs/common'
import { PromptMetricsService } from './prompt-metrics.service'

@Controller('prompt-metrics')
export class PromptMetricsController {
  constructor(private readonly service: PromptMetricsService) {}

  @Get()
  list() {
    return this.service.getAll()
  }

  @Get(':promptId')
  forPrompt(@Param('promptId') promptId: string) {
    return this.service.getForPrompt(promptId)
  }
}
