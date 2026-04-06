import { Injectable, Logger, ConflictException, OnModuleInit } from '@nestjs/common'
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import { PrismaClient, DriveSyncStatus } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import { GoogleDriveService } from './services/google-drive.service'
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
  private folderCategoryMap = new Map<string, string>() // driveId → category name

  constructor(
    private prisma: PrismaClient,
    private config: ConfigService<Env>,
    private driveService: GoogleDriveService,
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

  async triggerDownloadOnly(): Promise<{ message: string }> {
    if (this.isRunning) throw new ConflictException('Sync is already running')
    this.isRunning = true
    this.lastError = null
    this.stage3_downloadImages()
      .then(() => { this.lastSyncAt = new Date() })
      .catch((err) => { this.lastError = `Stage 3: ${err.message}`; this.logger.error(`Download failed: ${err.message}`, err.stack) })
      .finally(() => { this.isRunning = false })
    return { message: 'Download-only started' }
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
    } catch (err: any) {
      this.logger.warn(`Stage 1 failed: ${err.message}`)
      this.lastError = `Stage 1: ${err.message}`
    }
    try {
      await this.stage2_matchFolders()
    } catch (err: any) {
      this.logger.warn(`Stage 2 failed: ${err.message}`)
      if (!this.lastError) this.lastError = `Stage 2: ${err.message}`
    }
    try {
      await this.stage3_downloadImages()
      this.lastSyncAt = new Date()
    } catch (err: any) {
      this.logger.error(`Stage 3 failed: ${err.message}`, err.stack)
      if (!this.lastError) this.lastError = `Stage 3: ${err.message}`
    } finally {
      this.isRunning = false
    }
  }

  private async stage1_scanDrive(): Promise<void> {
    if (!this.rootFolderId) { this.logger.warn('No root folder configured, skipping scan'); return }

    // Level 1: brand/category folders (e.g. _TARGUS, Smart Home)
    const categoryFolders = await this.driveService.listSubfolders(this.rootFolderId)
    this.logger.log(`Found ${categoryFolders.length} category folders`)

    // Level 2: product folders inside each category
    this.folderCategoryMap.clear()
    const allProductFolders: { id: string; name: string; categoryName: string }[] = []
    for (const cat of categoryFolders) {
      const categoryName = cat.name.replace(/^_/, '').trim()
      const productFolders = await this.driveService.listSubfolders(cat.id)
      // Skip non-product folders (start with _)
      const realProducts = productFolders.filter((f) => !f.name.startsWith('_'))
      for (const pf of realProducts) {
        allProductFolders.push({ id: pf.id, name: pf.name, categoryName })
        this.folderCategoryMap.set(pf.id, categoryName)
      }
      this.logger.log(`  ${cat.name}: ${realProducts.length} product folders`)
    }

    const productFolderIds = new Set(allProductFolders.map((f) => f.id))

    // Upsert product folders into DB
    for (const pf of allProductFolders) {
      await this.prisma.driveFolder.upsert({
        where: { driveId: pf.id },
        create: { driveId: pf.id, name: pf.name },
        update: { name: pf.name },
      })
    }

    // For each product folder, recursively find all images
    let totalImages = 0
    for (const pf of allProductFolders) {
      const dbFolder = await this.prisma.driveFolder.findUnique({ where: { driveId: pf.id } })
      if (!dbFolder) continue

      const allImages = await this.driveService.listImagesRecursive(pf.id)
      const driveImageIds = new Set(allImages.map((i) => i.id))
      totalImages += allImages.length

      for (const img of allImages) {
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

    // Mark removed folders
    const allDbFolders = await this.prisma.driveFolder.findMany({ select: { id: true, driveId: true } })
    for (const dbf of allDbFolders) {
      if (!productFolderIds.has(dbf.driveId)) {
        await this.prisma.driveImage.updateMany({ where: { driveFolderId: dbf.id }, data: { syncStatus: 'DELETED' } })
      }
    }
    this.logger.log(`Stage 1 complete: ${allProductFolders.length} product folders, ${totalImages} images`)
  }

  private async stage2_matchFolders(): Promise<void> {
    const unmatchedFolders = await this.prisma.driveFolder.findMany({ where: { matchStatus: 'UNMATCHED' } })
    let created = 0

    for (const folder of unmatchedFolders) {
      const cleanName = folder.name.replace(/^_/, '').trim()
      const sku = this.generateSku(cleanName)
      const category = this.folderCategoryMap.get(folder.driveId)?.replace(/^_/, '').trim() ?? 'Geral'

      const existing = await this.prisma.product.findUnique({ where: { sku } })
      const product = existing ?? await this.prisma.product.create({
        data: {
          sku,
          name: cleanName,
          brand: this.inferBrand(category),
          category,
          description: `${cleanName} — importado automaticamente do Google Drive.`,
        },
      })

      await this.prisma.driveFolder.update({
        where: { id: folder.id },
        data: { productId: product.id, matchScore: 1.0, matchStatus: 'AUTO_MATCHED' },
      })
      created++
    }
    this.logger.log(`Stage 2 complete: ${created} products auto-created from ${unmatchedFolders.length} folders`)
  }

  private generateSku(name: string): string {
    return name
      .toUpperCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 30)
  }

  private inferBrand(category: string): string {
    const lower = category.toLowerCase()
    if (lower.includes('targus')) return 'Targus'
    if (lower.includes('rapoo')) return 'Rapoo'
    if (lower.includes('microsoft')) return 'Microsoft'
    return 'Multilaser'
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

    const WEB_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
    const webImages = folder.images.filter((img) => WEB_MIME_TYPES.has(img.mimeType))
    this.logger.log(`Folder ${folder.name}: ${webImages.length}/${folder.images.length} web images to download`)

    for (const img of webImages) {
      if (img.syncStatus === 'SYNCED' && img.storageKey) continue
      try {
        const buffer = await this.driveService.downloadFile(img.driveId)
        const storageKey = `products/${folder.productId}/drive/${img.driveId}-${img.fileName}`
        await this.storageService.upload(storageKey, buffer, img.mimeType, 'any')
        const publicUrl = this.storageService.getPublicUrl(storageKey)
        await this.prisma.driveImage.update({ where: { id: img.id }, data: { storageKey, syncStatus: 'SYNCED' } })
        const isPrimary = this.shouldBePrimary(img.fileName, folder.images)
        await this.prisma.productImage.upsert({
          where: { driveImageId: img.id },
          create: { productId: folder.productId, url: publicUrl, altText: img.fileName.replace(/\.[^.]+$/, ''), isPrimary, driveImageId: img.id },
          update: { url: publicUrl, altText: img.fileName.replace(/\.[^.]+$/, ''), isPrimary },
        })
        this.logger.log(`  Synced: ${img.fileName}`)
      } catch (err: any) {
        this.logger.error(`  Failed: ${img.fileName}: ${err.message}`)
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
