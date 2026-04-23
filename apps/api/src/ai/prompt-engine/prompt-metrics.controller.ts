import { Controller, Get, Param, Query } from '@nestjs/common'
import { PromptMetricsService, PromptMetricsQuery } from './prompt-metrics.service'

function parseQuery(q: any): PromptMetricsQuery {
  const out: PromptMetricsQuery = {}
  if (q.from) out.from = new Date(q.from)
  if (q.to) out.to = new Date(q.to)
  if (q.limit) out.limit = Number(q.limit)
  if (q.offset) out.offset = Number(q.offset)
  return out
}

@Controller('prompt-metrics')
export class PromptMetricsController {
  constructor(private readonly service: PromptMetricsService) {}

  @Get()
  list(@Query() q: any) {
    return this.service.getAll(parseQuery(q))
  }

  @Get(':promptId')
  forPrompt(@Param('promptId') promptId: string, @Query() q: any) {
    return this.service.getForPrompt(promptId, parseQuery(q))
  }
}
