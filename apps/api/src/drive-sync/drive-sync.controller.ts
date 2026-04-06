import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common'
import { DriveSyncService } from './drive-sync.service'
import { GoogleDriveService } from './services/google-drive.service'
import { LinkFolderDto } from './dto/link-folder.dto'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'

@Controller('drive-sync')
export class DriveSyncController {
  constructor(
    private readonly syncService: DriveSyncService,
    private readonly driveService: GoogleDriveService,
    private readonly config: ConfigService<Env>,
  ) {}

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

  @Post('download')
  download() { return this.syncService.triggerDownloadOnly() }

  @Get('diagnose')
  async diagnose(@Query('folderId') folderId?: string) {
    const targetId = folderId ?? this.config.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') ?? ''
    if (!targetId) return { error: 'No folderId provided and GOOGLE_DRIVE_ROOT_FOLDER_ID not set' }
    try {
      const [subfolders, images] = await Promise.all([
        this.driveService.listSubfolders(targetId),
        this.driveService.listImages(targetId),
      ])
      return { folderId: targetId, subfolders, images, subfoldersCount: subfolders.length, imagesCount: images.length }
    } catch (err: any) {
      return { error: err.message, folderId: targetId }
    }
  }
}
