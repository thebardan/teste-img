import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { DriveSyncService } from './drive-sync.service'
import { LinkFolderDto } from './dto/link-folder.dto'

@Controller('drive-sync')
export class DriveSyncController {
  constructor(private readonly syncService: DriveSyncService) {}

  @Post('trigger')
  trigger() { return this.syncService.triggerSync() }

  @Get('status')
  getStatus() { return this.syncService.getStatus() }

  @Get('unmatched')
  getUnmatched() { return this.syncService.getUnmatchedFolders() }

  @Post('folders/:id/link')
  linkFolder(@Param('id') id: string, @Body() dto: LinkFolderDto) { return this.syncService.linkFolder(id, dto.productId) }

  @Post('folders/:id/reject')
  rejectFolder(@Param('id') id: string) { return this.syncService.rejectFolder(id) }
}
