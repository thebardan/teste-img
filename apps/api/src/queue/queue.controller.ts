import { Controller, Get, Post, Param, Query } from '@nestjs/common'
import { QueueService } from './queue.service'
import { Roles } from '../auth/roles.decorator'
import { UserRole } from '@prisma/client'

@Controller('queues')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  @Get('stats')
  getStats() {
    return this.queueService.getStats()
  }

  @Get(':queue/failed')
  getFailedJobs(
    @Param('queue') queue: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    return this.queueService.getFailedJobs(
      queue,
      start ? Number(start) : 0,
      end ? Number(end) : 20,
    )
  }

  @Roles(UserRole.ADMIN)
  @Post(':queue/jobs/:id/retry')
  retryJob(@Param('queue') queue: string, @Param('id') id: string) {
    return this.queueService.retryFailed(queue, id)
  }
}
