import { Injectable, Logger, ConflictException, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import { PrismaClient, DriveSyncStatus } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import { GoogleDriveService } from './services/google-drive.service'
import { EmbeddingService } from './services/embedding.service'
import { VectorMatchService } from './services/vector-match.service'
import { StorageService } from '../storage/storage.service'
import type { Env } from '../config/env'
import type { SyncStatusDto, UnmatchedFolderDto } from './dto/sync-status.dto'

export const QUEUE_DRIVE_SYNC = 'drive-sync'

@Injectable()
export class DriveSyncService implements OnModuleInit {
  private readonly logger = new Logger(DriveSyncService.name)
  private readonly rootFolderId: string
  private isRunning = false
  private lastSyncAt: Date | null = null
  private lastError: string | null = null

  constructor(
    private prisma: PrismaClient,
    private config: ConfigService<Env>,
    private driveService: GoogleDriveService,
    private embeddingService: EmbeddingService,
    private vectorMatchService: VectorMatchService,
    private storageService: StorageService,
    @InjectQueue(QUEUE_DRIVE_SYNC) private syncQueue: Queue,
  ) {
    this.rootFolderId = this.config.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') ?? ''
  }

  async onModuleInit() {
    const cron = this.config.get('DRIVE_SYNC_CRON') ?? '0 3 * * *'
    try {
      const existing = await this.syncQueue.getRepeatableJobs()
      for (const job of existing) {
        await this.syncQueue.removeRepeatableByKey(job.key)
      }
      await this.syncQueue.add('drive-sync-cron', {}, { repeat: { pattern: cron } })
      this.logger.log(`Drive sync cron scheduled: ${cron}`)
    } catch (err: any) {
      this.logger.warn(`Failed to schedule cron: ${err.message}`)
    }
  }

  async triggerSync(): Promise<{ message: string }> {
    if (this.isRunning) throw new ConflictException('Sync is already running')
    this.runFullSync().catch((err) => {
      this.logger.error(`Sync failed: ${err.message}`, err.stack)
    })
    return { message: 'Sync started' }
  }

  async getStatus(): Promise<SyncStatusDto> {
    const [totalFolders, matchedFolders, unmatchedFolders, totalImages, syncedImages] =
      await Promise.all([
        this.prisma.driveFolder.count(),
        this.prisma.driveFolder.count({ where: { matchStatus: { in: ['AUTO_MATCHED', 'MANUAL_MATCHED'] } } }),
        this.prisma.driveFolder.count({ where: { matchStatus: 'UNMATCHED' } }),
        this.prisma.driveImage.count(),
        this.prisma.driveImage.count({ where: { syncStatus: 'SYNCED' } }),
      ])
    return {
      isRunning: this.isRunning,
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
      nextSyncAt: null,
      stats: { totalFolders, matchedFolders, unmatchedFolders, totalImages, syncedImages },
      lastError: this.lastError,
    }
  }

  async getUnmatchedFolders(): Promise<UnmatchedFolderDto[]> {
    const folders = await this.prisma.driveFolder.findMany({
      where: { matchStatus: 'UNMATCHED' },
      orderBy: { name: 'asc' },
    })

    return Promise.all(
      folders.map(async (folder) => {
        const imageCount = await this.prisma.driveImage.count({ where: { driveFolderId: folder.id } })
        let suggestedProduct: UnmatchedFolderDto['suggestedProduct'] = null
        if (folder.productId) {
          const p = await this.prisma.product.findUnique({ where: { id: folder.productId }, select: { id: true, name: true, sku: true } })
          if (p) suggestedProduct = p
        }
        return {
          id: folder.id,
          driveId: folder.driveId,
          name: folder.name,
          matchScore: folder.matchScore,
          suggestedProduct,
          imageCount,
          createdAt: folder.createdAt.toISOString(),
        }
      }),
    )
  }

  async linkFolder(folderId: string, productId: string): Promise<void> {
    await this.prisma.driveFolder.update({
      where: { id: folderId },
      data: { productId, matchStatus: 'MANUAL_MATCHED', matchScore: 1.0 },
    })
    await this.downloadImagesForFolder(folderId)
  }

  async rejectFolder(folderId: string): Promise<void> {
    await this.prisma.driveFolder.update({ where: { id: folderId }, data: { matchStatus: 'REJECTED' } })
  }

  async runFullSync(): Promise<void> {
    this.isRunning = true
    this.lastError = null
    try {
      await this.stage1_scanDrive()
      await this.stage2_matchFolders()
      await this.stage3_downloadImages()
      this.lastSyncAt = new Date()
    } catch (err: any) {
      this.lastError = err.message
      throw err
    } finally {
      this.isRunning = false
    }
  }

  private async stage1_scanDrive(): Promise<void> {
    if (!this.rootFolderId) { this.logger.warn('No root folder configured, skipping scan'); return }
    const driveFolders = await this.driveService.listSubfolders(this.rootFolderId)
    const drivefolderIds = new Set(driveFolders.map((f) => f.id))

    for (const df of driveFolders) {
      await this.prisma.driveFolder.upsert({
        where: { driveId: df.id },
        create: { driveId: df.id, name: df.name },
        update: { name: df.name },
      })
    }

    for (const df of driveFolders) {
      const dbFolder = await this.prisma.driveFolder.findUnique({ where: { driveId: df.id } })
      if (!dbFolder) continue
      const driveImages = await this.driveService.listImages(df.id)
      const driveImageIds = new Set(driveImages.map((i) => i.id))
      for (const img of driveImages) {
        await this.prisma.driveImage.upsert({
          where: { driveId: img.id },
          create: { driveId: img.id, driveFolderId: dbFolder.id, fileName: img.name, mimeType: img.mimeType, driveModifiedAt: new Date(img.modifiedTime) },
          update: { fileName: img.name, mimeType: img.mimeType, driveModifiedAt: new Date(img.modifiedTime) },
        })
      }
      await this.prisma.driveImage.updateMany({
        where: { driveFolderId: dbFolder.id, driveId: { notIn: [...driveImageIds] }, syncStatus: { not: 'DELETED' } },
        data: { syncStatus: 'DELETED' },
      })
    }

    const allDbFolders = await this.prisma.driveFolder.findMany({ select: { id: true, driveId: true } })
    for (const dbf of allDbFolders) {
      if (!drivefolderIds.has(dbf.driveId)) {
        await this.prisma.driveImage.updateMany({ where: { driveFolderId: dbf.id }, data: { syncStatus: 'DELETED' } })
      }
    }
    this.logger.log(`Stage 1 complete: ${driveFolders.length} folders`)
  }

  private async stage2_matchFolders(): Promise<void> {
    const productsWithoutEmbedding = await this.prisma.$queryRawUnsafe<{ id: string; name: string; sku: string }[]>(
      `SELECT id, name, sku FROM "Product" WHERE embedding IS NULL AND "isActive" = true`,
    )
    for (const p of productsWithoutEmbedding) {
      const result = await this.embeddingService.embed(`${p.name} ${p.sku}`)
      await this.vectorMatchService.storeProductEmbedding(p.id, result.values)
    }

    const unmatchedFolders = await this.prisma.driveFolder.findMany({ where: { matchStatus: 'UNMATCHED' } })
    const threshold = this.vectorMatchService.getThreshold()
    let matched = 0

    for (const folder of unmatchedFolders) {
      const result = await this.embeddingService.embed(folder.name)
      await this.vectorMatchService.storeFolderEmbedding(folder.id, result.values)
      const match = await this.vectorMatchService.findBestMatch(result.values)
      if (match && match.score >= threshold) {
        await this.prisma.driveFolder.update({ where: { id: folder.id }, data: { productId: match.productId, matchScore: match.score, matchStatus: 'AUTO_MATCHED' } })
        matched++
      } else {
        await this.prisma.driveFolder.update({ where: { id: folder.id }, data: { matchScore: match?.score ?? null, productId: match?.productId ?? null } })
      }
    }
    this.logger.log(`Stage 2 complete: ${matched}/${unmatchedFolders.length} matched`)
  }

  private async stage3_downloadImages(): Promise<void> {
    const matchedFolders = await this.prisma.driveFolder.findMany({ where: { matchStatus: { in: ['AUTO_MATCHED', 'MANUAL_MATCHED'] } } })
    for (const folder of matchedFolders) {
      await this.downloadImagesForFolder(folder.id)
    }

    const deletedImages = await this.prisma.driveImage.findMany({ where: { syncStatus: 'DELETED' }, include: { productImage: true } })
    for (const img of deletedImages) {
      if (img.productImage) {
        await this.prisma.productImage.delete({ where: { id: img.productImage.id } })
        if (img.storageKey) await this.storageService.delete(img.storageKey).catch(() => {})
      }
    }

    await this.prisma.driveFolder.updateMany({ where: { matchStatus: { in: ['AUTO_MATCHED', 'MANUAL_MATCHED'] } }, data: { lastSyncedAt: new Date() } })
    this.logger.log('Stage 3 complete')
  }

  private async downloadImagesForFolder(folderId: string): Promise<void> {
    const folder = await this.prisma.driveFolder.findUnique({ where: { id: folderId }, include: { images: { where: { syncStatus: { not: 'DELETED' } } } } })
    if (!folder || !folder.productId) return

    for (const img of folder.images) {
      if (img.syncStatus === 'SYNCED' && img.storageKey) continue
      try {
        const buffer = await this.driveService.downloadFile(img.driveId)
        const storageKey = `products/${folder.productId}/drive/${img.driveId}-${img.fileName}`
        await this.storageService.upload(storageKey, buffer, img.mimeType, 'image')
        await this.prisma.driveImage.update({ where: { id: img.id }, data: { storageKey, syncStatus: 'SYNCED' } })
        const isPrimary = this.shouldBePrimary(img.fileName, folder.images)
        await this.prisma.productImage.upsert({
          where: { driveImageId: img.id },
          create: { productId: folder.productId, url: storageKey, altText: img.fileName.replace(/\.[^.]+$/, ''), isPrimary, driveImageId: img.id },
          update: { url: storageKey, altText: img.fileName.replace(/\.[^.]+$/, ''), isPrimary },
        })
      } catch (err: any) {
        this.logger.error(`Failed to download ${img.fileName}: ${err.message}`)
        await this.prisma.driveImage.update({ where: { id: img.id }, data: { syncStatus: 'ERROR' } })
      }
    }
  }

  private shouldBePrimary(fileName: string, allImages: { fileName: string; syncStatus: DriveSyncStatus }[]): boolean {
    if (fileName.toLowerCase().includes('pack')) return true
    const active = allImages.filter((i) => i.syncStatus !== 'DELETED').map((i) => i.fileName).sort()
    return active[0] === fileName
  }
}
