# Google Drive Sync + Art Composition Pipeline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sync product images from Google Drive using vector-based folder matching (pgvector + Gemini embeddings), and compose final sales sheet artwork using Gemini 3.1 Flash image generation.

**Architecture:** Three-stage sync pipeline (scan → match → download) running as Bull queue jobs with cron + manual trigger. Art composition via `gemini-3.1-flash-image-preview` takes real product images + AI-generated text content and produces final sales sheet artwork. Frontend admin page for sync status and manual folder linking.

**Tech Stack:** NestJS, Prisma, pgvector, Google Drive API (googleapis), Gemini Embedding 2 Preview, Gemini 3.1 Flash Image Preview, Bull/BullMQ, MinIO, Next.js, TanStack Query

---

## File Structure

### API (apps/api)

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | Add DriveFolder, DriveImage models, modify Product, ProductImage, SalesSheetVersion |
| `src/config/env.ts` | Add Google Drive and embedding env vars |
| `src/queue/queue.constants.ts` | Add QUEUE_DRIVE_SYNC constant |
| `src/queue/queue.module.ts` | Register drive-sync queue |
| `src/queue/queue.service.ts` | Add drive-sync queue stats |
| `src/drive-sync/drive-sync.module.ts` | Module wiring for drive sync feature |
| `src/drive-sync/drive-sync.controller.ts` | REST endpoints for trigger, status, unmatched, link, reject |
| `src/drive-sync/drive-sync.service.ts` | Orchestrates the 3-stage sync pipeline |
| `src/drive-sync/drive-sync.processor.ts` | Bull processor for async sync jobs |
| `src/drive-sync/services/google-drive.service.ts` | Google Drive API wrapper (list folders, list files, download) |
| `src/drive-sync/services/embedding.service.ts` | Gemini Embedding 2 Preview wrapper |
| `src/drive-sync/services/vector-match.service.ts` | pgvector cosine similarity queries |
| `src/drive-sync/dto/link-folder.dto.ts` | DTO for manual folder→product linking |
| `src/drive-sync/dto/sync-status.dto.ts` | DTO for sync status response |
| `src/ai/providers/gemini/gemini-art.provider.ts` | Gemini 3.1 Flash image generation provider |
| `src/sales-sheets/services/art-composer.service.ts` | Composes final artwork from images + content |
| `src/sales-sheets/sales-sheets.module.ts` | Add ArtComposerService |
| `src/sales-sheets/sales-sheets.controller.ts` | Add generate-art endpoint |

### Web (apps/web)

| File | Responsibility |
|------|---------------|
| `app/drive-sync/page.tsx` | Server component wrapper |
| `app/drive-sync/drive-sync-client.tsx` | Client component: status, trigger, unmatched table |
| `lib/hooks/use-drive-sync.ts` | TanStack Query hooks for drive sync API |
| `components/layout/sidebar.tsx` | Add Google Drive nav item |

---

## Task 1: Prisma Schema — pgvector Extension + New Models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

- [ ] **Step 1: Add pgvector extension and new enums to schema**

At the top of `schema.prisma`, after the existing generator/datasource blocks, add:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}

datasource db {
  provider   = "postgresql"
  url        = env("DATABASE_URL")
  extensions = [pgvector(map: "vector", schema: "public")]
}
```

Then add the enums after the existing enums:

```prisma
enum DriveMatchStatus {
  AUTO_MATCHED
  MANUAL_MATCHED
  UNMATCHED
  REJECTED
}

enum DriveSyncStatus {
  PENDING
  SYNCED
  DELETED
  ERROR
}
```

- [ ] **Step 2: Add DriveFolder model**

After the new enums, add:

```prisma
model DriveFolder {
  id           String           @id @default(cuid())
  driveId      String           @unique
  name         String
  embedding    Unsupported("vector(256)")?
  productId    String?
  matchScore   Float?
  matchStatus  DriveMatchStatus @default(UNMATCHED)
  lastSyncedAt DateTime?
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  product Product?     @relation(fields: [productId], references: [id])
  images  DriveImage[]

  @@index([productId])
  @@index([matchStatus])
}
```

- [ ] **Step 3: Add DriveImage model**

```prisma
model DriveImage {
  id              String          @id @default(cuid())
  driveId         String          @unique
  driveFolderId   String
  fileName        String
  mimeType        String
  driveModifiedAt DateTime
  storageKey      String?
  syncStatus      DriveSyncStatus @default(PENDING)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  folder       DriveFolder   @relation(fields: [driveFolderId], references: [id], onDelete: Cascade)
  productImage ProductImage?

  @@index([driveFolderId])
  @@index([syncStatus])
}
```

- [ ] **Step 4: Modify existing models**

Add to `Product` model:

```prisma
  embedding    Unsupported("vector(256)")?
  driveFolders DriveFolder[]
```

Add to `ProductImage` model:

```prisma
  driveImageId String?     @unique
  driveImage   DriveImage? @relation(fields: [driveImageId], references: [id])
```

Add to `SalesSheetVersion` model:

```prisma
  artImageKey    String?
  artGeneratedAt DateTime?
```

- [ ] **Step 5: Create and apply migration**

```bash
cd apps/api
npx prisma migrate dev --name add-drive-sync-and-art
```

- [ ] **Step 6: Verify pgvector extension is active**

```bash
cd apps/api
npx prisma db execute --stdin <<< "SELECT extname FROM pg_extension WHERE extname = 'vector';"
```

Expected: one row with `vector`

- [ ] **Step 7: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat: add pgvector extension, DriveFolder/DriveImage models, art fields"
```

---

## Task 2: Environment Configuration

**Files:**
- Modify: `apps/api/src/config/env.ts`
- Modify: `apps/api/.env`
- Modify: `.env.example`

- [ ] **Step 1: Add new env vars to the Zod schema**

In `apps/api/src/config/env.ts`, add these fields to the `envSchema` object:

```typescript
  // Google Drive
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().email().optional(),
  GOOGLE_SERVICE_ACCOUNT_KEY: z.string().optional(),
  GOOGLE_DRIVE_ROOT_FOLDER_ID: z.string().optional(),

  // Drive Sync
  DRIVE_SYNC_CRON: z.string().default('0 3 * * *'),
  DRIVE_SYNC_MATCH_THRESHOLD: z.coerce.number().default(0.75),

  // Embeddings
  EMBEDDING_MODEL: z.string().default('gemini-embedding-2-preview'),
  EMBEDDING_DIMENSIONS: z.coerce.number().default(256),

  // Art Composition
  ART_MODEL: z.string().default('gemini-3.1-flash-image-preview'),
  ART_DEFAULT_RESOLUTION: z.string().default('2K'),
```

- [ ] **Step 2: Add values to `apps/api/.env`**

```env
# Google Drive
GOOGLE_SERVICE_ACCOUNT_EMAIL="botcriador@sqddgtl.iam.gserviceaccount.com"
GOOGLE_SERVICE_ACCOUNT_KEY="<paste-private-key-here>"
GOOGLE_DRIVE_ROOT_FOLDER_ID="16X3WZRaYQndX18rBN-xFplrmFg-W6LN9"

# Drive Sync
DRIVE_SYNC_CRON="0 3 * * *"
DRIVE_SYNC_MATCH_THRESHOLD=0.75

# Embeddings
EMBEDDING_MODEL="gemini-embedding-2-preview"
EMBEDDING_DIMENSIONS=256

# Art Composition
ART_MODEL="gemini-3.1-flash-image-preview"
ART_DEFAULT_RESOLUTION="2K"
```

- [ ] **Step 3: Update `.env.example` with placeholder values**

Same as Step 2 but with `GOOGLE_SERVICE_ACCOUNT_KEY="<your-service-account-private-key>"` and no real credentials.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/config/env.ts .env.example
git commit -m "feat: add Google Drive, embedding, and art env configuration"
```

**Note:** Do NOT commit `apps/api/.env` — it contains secrets.

---

## Task 3: Google Drive Service

**Files:**
- Create: `apps/api/src/drive-sync/services/google-drive.service.ts`

- [ ] **Step 1: Install googleapis**

```bash
cd apps/api
npm install googleapis
```

- [ ] **Step 2: Create the Google Drive service**

Create `apps/api/src/drive-sync/services/google-drive.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { google, drive_v3 } from 'googleapis'
import type { Env } from '../../config/env'
import { Readable } from 'stream'

export interface DriveFileInfo {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
}

export interface DriveFolderInfo {
  id: string
  name: string
}

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name)
  private drive: drive_v3.Drive

  constructor(private config: ConfigService<Env>) {
    const email = this.config.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')
    const key = this.config.get('GOOGLE_SERVICE_ACCOUNT_KEY')

    if (!email || !key) {
      this.logger.warn('Google Drive credentials not configured')
      return
    }

    const auth = new google.auth.JWT({
      email,
      key: key.replace(/\\n/g, '\n'),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    })

    this.drive = google.drive({ version: 'v3', auth })
  }

  async listSubfolders(parentFolderId: string): Promise<DriveFolderInfo[]> {
    const folders: DriveFolderInfo[] = []
    let pageToken: string | undefined

    do {
      const res = await this.drive.files.list({
        q: `'${parentFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'nextPageToken, files(id, name)',
        pageSize: 100,
        pageToken,
      })

      for (const f of res.data.files ?? []) {
        if (f.id && f.name) folders.push({ id: f.id, name: f.name })
      }
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    return folders
  }

  async listImages(folderId: string): Promise<DriveFileInfo[]> {
    const images: DriveFileInfo[] = []
    let pageToken: string | undefined

    do {
      const res = await this.drive.files.list({
        q: `'${folderId}' in parents and (mimeType contains 'image/') and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, modifiedTime)',
        pageSize: 100,
        pageToken,
      })

      for (const f of res.data.files ?? []) {
        if (f.id && f.name && f.mimeType && f.modifiedTime) {
          images.push({
            id: f.id,
            name: f.name,
            mimeType: f.mimeType,
            modifiedTime: f.modifiedTime,
          })
        }
      }
      pageToken = res.data.nextPageToken ?? undefined
    } while (pageToken)

    return images
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const res = await this.drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' },
    )

    const chunks: Buffer[] = []
    const stream = res.data as Readable
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
}
```

- [ ] **Step 3: Verify compilation**

```bash
cd apps/api && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: no errors related to `google-drive.service.ts`

- [ ] **Step 4: Commit**

```bash
git add apps/api/package.json apps/api/package-lock.json apps/api/src/drive-sync/services/google-drive.service.ts
git commit -m "feat: add Google Drive API service with folder/file listing and download"
```

---

## Task 4: Embedding Service

**Files:**
- Create: `apps/api/src/drive-sync/services/embedding.service.ts`

- [ ] **Step 1: Create the embedding service**

Create `apps/api/src/drive-sync/services/embedding.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../config/env'

export interface EmbeddingResult {
  values: number[]
  model: string
  durationMs: number
}

@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name)
  private readonly apiKey: string
  private readonly model: string
  private readonly dimensions: number
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private config: ConfigService<Env>) {
    this.apiKey = this.config.get('GEMINI_API_KEY') ?? ''
    this.model = this.config.get('EMBEDDING_MODEL') ?? 'gemini-embedding-2-preview'
    this.dimensions = this.config.get('EMBEDDING_DIMENSIONS') ?? 256
  }

  async embed(text: string): Promise<EmbeddingResult> {
    const start = Date.now()

    const body = {
      model: `models/${this.model}`,
      content: { parts: [{ text }] },
      outputDimensionality: this.dimensions,
    }

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:embedContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini Embedding API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const values: number[] = data.embedding?.values ?? []

    return { values, model: this.model, durationMs: Date.now() - start }
  }

  async embedBatch(texts: string[]): Promise<EmbeddingResult[]> {
    const results: EmbeddingResult[] = []
    // Process in batches of 10 to avoid rate limits
    for (let i = 0; i < texts.length; i += 10) {
      const batch = texts.slice(i, i + 10)
      const batchResults = await Promise.all(batch.map((t) => this.embed(t)))
      results.push(...batchResults)
    }
    return results
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/drive-sync/services/embedding.service.ts
git commit -m "feat: add Gemini Embedding 2 Preview service for vector generation"
```

---

## Task 5: Vector Match Service (pgvector queries)

**Files:**
- Create: `apps/api/src/drive-sync/services/vector-match.service.ts`

- [ ] **Step 1: Create the vector match service**

Create `apps/api/src/drive-sync/services/vector-match.service.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../config/env'

export interface MatchResult {
  productId: string
  productName: string
  score: number
}

@Injectable()
export class VectorMatchService {
  private readonly logger = new Logger(VectorMatchService.name)
  private readonly threshold: number

  constructor(
    private prisma: PrismaClient,
    private config: ConfigService<Env>,
  ) {
    this.threshold = this.config.get('DRIVE_SYNC_MATCH_THRESHOLD') ?? 0.75
  }

  async storeProductEmbedding(productId: string, embedding: number[]): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`
    await this.prisma.$executeRawUnsafe(
      `UPDATE "Product" SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      productId,
    )
  }

  async storeFolderEmbedding(folderId: string, embedding: number[]): Promise<void> {
    const vectorStr = `[${embedding.join(',')}]`
    await this.prisma.$executeRawUnsafe(
      `UPDATE "DriveFolder" SET embedding = $1::vector WHERE id = $2`,
      vectorStr,
      folderId,
    )
  }

  async findBestMatch(folderEmbedding: number[]): Promise<MatchResult | null> {
    const vectorStr = `[${folderEmbedding.join(',')}]`

    const results = await this.prisma.$queryRawUnsafe<
      { id: string; name: string; score: number }[]
    >(
      `SELECT id, name, 1 - (embedding <=> $1::vector) AS score
       FROM "Product"
       WHERE embedding IS NOT NULL
       ORDER BY embedding <=> $1::vector
       LIMIT 1`,
      vectorStr,
    )

    if (results.length === 0) return null

    const best = results[0]
    if (best.score < this.threshold) {
      return { productId: best.id, productName: best.name, score: best.score }
    }

    return { productId: best.id, productName: best.name, score: best.score }
  }

  getThreshold(): number {
    return this.threshold
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/drive-sync/services/vector-match.service.ts
git commit -m "feat: add pgvector match service for folder-to-product similarity search"
```

---

## Task 6: Drive Sync DTOs

**Files:**
- Create: `apps/api/src/drive-sync/dto/link-folder.dto.ts`
- Create: `apps/api/src/drive-sync/dto/sync-status.dto.ts`

- [ ] **Step 1: Create link-folder DTO**

Create `apps/api/src/drive-sync/dto/link-folder.dto.ts`:

```typescript
export class LinkFolderDto {
  productId: string
}
```

- [ ] **Step 2: Create sync-status DTO**

Create `apps/api/src/drive-sync/dto/sync-status.dto.ts`:

```typescript
export interface SyncStatusDto {
  isRunning: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  stats: {
    totalFolders: number
    matchedFolders: number
    unmatchedFolders: number
    totalImages: number
    syncedImages: number
  }
  lastError: string | null
}

export interface UnmatchedFolderDto {
  id: string
  driveId: string
  name: string
  matchScore: number | null
  suggestedProduct: {
    id: string
    name: string
    sku: string
  } | null
  imageCount: number
  createdAt: string
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/drive-sync/dto/
git commit -m "feat: add drive sync DTOs for link and status endpoints"
```

---

## Task 7: Drive Sync Service (3-stage pipeline)

**Files:**
- Create: `apps/api/src/drive-sync/drive-sync.service.ts`

- [ ] **Step 1: Create the orchestration service**

Create `apps/api/src/drive-sync/drive-sync.service.ts`:

```typescript
import { Injectable, Logger, ConflictException } from '@nestjs/common'
import { PrismaClient, DriveMatchStatus, DriveSyncStatus } from '@prisma/client'
import { ConfigService } from '@nestjs/config'
import { GoogleDriveService } from './services/google-drive.service'
import { EmbeddingService } from './services/embedding.service'
import { VectorMatchService } from './services/vector-match.service'
import { StorageService } from '../storage/storage.service'
import type { Env } from '../config/env'
import type { SyncStatusDto, UnmatchedFolderDto } from './dto/sync-status.dto'

@Injectable()
export class DriveSyncService {
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
  ) {
    this.rootFolderId = this.config.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') ?? ''
  }

  // ─── Public API ──────────────────────────────────────────────────────────────

  async triggerSync(): Promise<{ message: string }> {
    if (this.isRunning) {
      throw new ConflictException('Sync is already running')
    }
    // Run async — don't block the request
    this.runFullSync().catch((err) => {
      this.logger.error(`Sync failed: ${err.message}`, err.stack)
    })
    return { message: 'Sync started' }
  }

  async getStatus(): Promise<SyncStatusDto> {
    const [totalFolders, matchedFolders, unmatchedFolders, totalImages, syncedImages] =
      await Promise.all([
        this.prisma.driveFolder.count(),
        this.prisma.driveFolder.count({
          where: { matchStatus: { in: ['AUTO_MATCHED', 'MANUAL_MATCHED'] } },
        }),
        this.prisma.driveFolder.count({ where: { matchStatus: 'UNMATCHED' } }),
        this.prisma.driveImage.count(),
        this.prisma.driveImage.count({ where: { syncStatus: 'SYNCED' } }),
      ])

    return {
      isRunning: this.isRunning,
      lastSyncAt: this.lastSyncAt?.toISOString() ?? null,
      nextSyncAt: null, // Computed from cron expression by frontend if needed
      stats: { totalFolders, matchedFolders, unmatchedFolders, totalImages, syncedImages },
      lastError: this.lastError,
    }
  }

  async getUnmatchedFolders(): Promise<UnmatchedFolderDto[]> {
    const folders = await this.prisma.driveFolder.findMany({
      where: { matchStatus: 'UNMATCHED' },
      orderBy: { name: 'asc' },
    })

    const results: UnmatchedFolderDto[] = []
    for (const folder of folders) {
      const imageCount = await this.prisma.driveImage.count({
        where: { driveFolderId: folder.id },
      })

      // Find best product suggestion via raw query
      let suggestedProduct: UnmatchedFolderDto['suggestedProduct'] = null
      if (folder.matchScore !== null) {
        const product = folder.productId
          ? await this.prisma.product.findUnique({
              where: { id: folder.productId },
              select: { id: true, name: true, sku: true },
            })
          : null
        // For unmatched folders, find closest product even if below threshold
        if (!product && folder.embedding) {
          const match = await this.vectorMatchService.findBestMatch(
            await this.getFolderEmbeddingValues(folder.id),
          )
          if (match) {
            const p = await this.prisma.product.findUnique({
              where: { id: match.productId },
              select: { id: true, name: true, sku: true },
            })
            if (p) suggestedProduct = p
          }
        } else if (product) {
          suggestedProduct = product
        }
      }

      results.push({
        id: folder.id,
        driveId: folder.driveId,
        name: folder.name,
        matchScore: folder.matchScore,
        suggestedProduct,
        imageCount,
        createdAt: folder.createdAt.toISOString(),
      })
    }

    return results
  }

  async linkFolder(folderId: string, productId: string): Promise<void> {
    await this.prisma.driveFolder.update({
      where: { id: folderId },
      data: {
        productId,
        matchStatus: 'MANUAL_MATCHED',
        matchScore: 1.0,
      },
    })
    // Trigger image download for this folder
    await this.downloadImagesForFolder(folderId)
  }

  async rejectFolder(folderId: string): Promise<void> {
    await this.prisma.driveFolder.update({
      where: { id: folderId },
      data: { matchStatus: 'REJECTED' },
    })
  }

  // ─── Pipeline ────────────────────────────────────────────────────────────────

  async runFullSync(): Promise<void> {
    this.isRunning = true
    this.lastError = null
    this.logger.log('Starting full Drive sync...')

    try {
      await this.stage1_scanDrive()
      await this.stage2_matchFolders()
      await this.stage3_downloadImages()
      this.lastSyncAt = new Date()
      this.logger.log('Drive sync completed successfully')
    } catch (err: any) {
      this.lastError = err.message
      this.logger.error(`Drive sync failed: ${err.message}`, err.stack)
      throw err
    } finally {
      this.isRunning = false
    }
  }

  // ─── Stage 1: Scan Drive ─────────────────────────────────────────────────────

  private async stage1_scanDrive(): Promise<void> {
    this.logger.log('Stage 1: Scanning Drive folders...')
    const driveFolders = await this.driveService.listSubfolders(this.rootFolderId)
    const drivefolderIds = new Set(driveFolders.map((f) => f.id))

    // Upsert folders
    for (const df of driveFolders) {
      await this.prisma.driveFolder.upsert({
        where: { driveId: df.id },
        create: { driveId: df.id, name: df.name },
        update: { name: df.name },
      })
    }

    // List images for each folder
    for (const df of driveFolders) {
      const dbFolder = await this.prisma.driveFolder.findUnique({
        where: { driveId: df.id },
      })
      if (!dbFolder) continue

      const driveImages = await this.driveService.listImages(df.id)
      const driveImageIds = new Set(driveImages.map((i) => i.id))

      for (const img of driveImages) {
        await this.prisma.driveImage.upsert({
          where: { driveId: img.id },
          create: {
            driveId: img.id,
            driveFolderId: dbFolder.id,
            fileName: img.name,
            mimeType: img.mimeType,
            driveModifiedAt: new Date(img.modifiedTime),
          },
          update: {
            fileName: img.name,
            mimeType: img.mimeType,
            driveModifiedAt: new Date(img.modifiedTime),
          },
        })
      }

      // Mark images not in Drive as DELETED
      await this.prisma.driveImage.updateMany({
        where: {
          driveFolderId: dbFolder.id,
          driveId: { notIn: [...driveImageIds] },
          syncStatus: { not: 'DELETED' },
        },
        data: { syncStatus: 'DELETED' },
      })
    }

    // Mark folders not in Drive for cleanup
    const allDbFolders = await this.prisma.driveFolder.findMany({
      select: { id: true, driveId: true },
    })
    for (const dbf of allDbFolders) {
      if (!drivefolderIds.has(dbf.driveId)) {
        await this.prisma.driveImage.updateMany({
          where: { driveFolderId: dbf.id },
          data: { syncStatus: 'DELETED' },
        })
      }
    }

    this.logger.log(`Stage 1 complete: ${driveFolders.length} folders scanned`)
  }

  // ─── Stage 2: Match Folders ──────────────────────────────────────────────────

  private async stage2_matchFolders(): Promise<void> {
    this.logger.log('Stage 2: Matching folders to products...')

    // Ensure all products have embeddings
    const productsWithoutEmbedding = await this.prisma.$queryRawUnsafe<
      { id: string; name: string; sku: string }[]
    >(`SELECT id, name, sku FROM "Product" WHERE embedding IS NULL AND "isActive" = true`)

    for (const p of productsWithoutEmbedding) {
      const text = `${p.name} ${p.sku}`
      const result = await this.embeddingService.embed(text)
      await this.vectorMatchService.storeProductEmbedding(p.id, result.values)
    }

    // Match unmatched folders
    const unmatchedFolders = await this.prisma.driveFolder.findMany({
      where: { matchStatus: 'UNMATCHED' },
    })

    const threshold = this.vectorMatchService.getThreshold()
    let matched = 0

    for (const folder of unmatchedFolders) {
      const result = await this.embeddingService.embed(folder.name)
      await this.vectorMatchService.storeFolderEmbedding(folder.id, result.values)

      const match = await this.vectorMatchService.findBestMatch(result.values)
      if (match && match.score >= threshold) {
        await this.prisma.driveFolder.update({
          where: { id: folder.id },
          data: {
            productId: match.productId,
            matchScore: match.score,
            matchStatus: 'AUTO_MATCHED',
          },
        })
        matched++
      } else {
        await this.prisma.driveFolder.update({
          where: { id: folder.id },
          data: {
            matchScore: match?.score ?? null,
            productId: match?.productId ?? null,
          },
        })
      }
    }

    this.logger.log(`Stage 2 complete: ${matched}/${unmatchedFolders.length} folders matched`)
  }

  // ─── Stage 3: Download Images ────────────────────────────────────────────────

  private async stage3_downloadImages(): Promise<void> {
    this.logger.log('Stage 3: Downloading images...')

    const matchedFolders = await this.prisma.driveFolder.findMany({
      where: { matchStatus: { in: ['AUTO_MATCHED', 'MANUAL_MATCHED'] } },
      include: { images: true },
    })

    let downloaded = 0
    let deleted = 0

    for (const folder of matchedFolders) {
      await this.downloadImagesForFolder(folder.id)
      // Count results
      const syncedCount = await this.prisma.driveImage.count({
        where: { driveFolderId: folder.id, syncStatus: 'SYNCED' },
      })
      downloaded += syncedCount
    }

    // Clean up deleted images from ProductImage
    const deletedImages = await this.prisma.driveImage.findMany({
      where: { syncStatus: 'DELETED' },
      include: { productImage: true },
    })

    for (const img of deletedImages) {
      if (img.productImage) {
        await this.prisma.productImage.delete({ where: { id: img.productImage.id } })
        if (img.storageKey) {
          await this.storageService.delete(img.storageKey).catch(() => {})
        }
        deleted++
      }
    }

    // Update lastSyncedAt for processed folders
    await this.prisma.driveFolder.updateMany({
      where: { matchStatus: { in: ['AUTO_MATCHED', 'MANUAL_MATCHED'] } },
      data: { lastSyncedAt: new Date() },
    })

    this.logger.log(`Stage 3 complete: ${downloaded} synced, ${deleted} deleted`)
  }

  private async downloadImagesForFolder(folderId: string): Promise<void> {
    const folder = await this.prisma.driveFolder.findUnique({
      where: { id: folderId },
      include: { images: { where: { syncStatus: { not: 'DELETED' } } } },
    })
    if (!folder || !folder.productId) return

    for (const img of folder.images) {
      // Skip if already synced and not modified
      if (img.syncStatus === 'SYNCED' && img.storageKey) {
        continue
      }

      try {
        const buffer = await this.driveService.downloadFile(img.driveId)
        const storageKey = `products/${folder.productId}/drive/${img.driveId}-${img.fileName}`

        await this.storageService.upload(storageKey, buffer, img.mimeType, 'image')

        await this.prisma.driveImage.update({
          where: { id: img.id },
          data: { storageKey, syncStatus: 'SYNCED' },
        })

        // Upsert ProductImage
        const isPrimary = this.shouldBePrimary(img.fileName, folder.images)
        await this.prisma.productImage.upsert({
          where: { driveImageId: img.id },
          create: {
            productId: folder.productId,
            url: storageKey,
            altText: img.fileName.replace(/\.[^.]+$/, ''),
            isPrimary,
            driveImageId: img.id,
          },
          update: {
            url: storageKey,
            altText: img.fileName.replace(/\.[^.]+$/, ''),
            isPrimary,
          },
        })
      } catch (err: any) {
        this.logger.error(`Failed to download ${img.fileName}: ${err.message}`)
        await this.prisma.driveImage.update({
          where: { id: img.id },
          data: { syncStatus: 'ERROR' },
        })
      }
    }
  }

  private shouldBePrimary(
    fileName: string,
    allImages: { fileName: string; syncStatus: DriveSyncStatus }[],
  ): boolean {
    const lower = fileName.toLowerCase()
    if (lower.includes('pack')) return true

    const active = allImages
      .filter((i) => i.syncStatus !== 'DELETED')
      .map((i) => i.fileName)
      .sort()

    return active[0] === fileName
  }

  private async getFolderEmbeddingValues(folderId: string): Promise<number[]> {
    const result = await this.prisma.$queryRawUnsafe<{ embedding: string }[]>(
      `SELECT embedding::text FROM "DriveFolder" WHERE id = $1`,
      folderId,
    )
    if (result.length === 0 || !result[0].embedding) return []
    return JSON.parse(result[0].embedding)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/drive-sync/drive-sync.service.ts
git commit -m "feat: add 3-stage drive sync service (scan, match, download)"
```

---

## Task 8: Drive Sync Processor (Bull Queue)

**Files:**
- Modify: `apps/api/src/queue/queue.constants.ts`
- Modify: `apps/api/src/queue/queue.module.ts`
- Modify: `apps/api/src/queue/queue.service.ts`
- Create: `apps/api/src/drive-sync/drive-sync.processor.ts`

- [ ] **Step 1: Add queue constant**

In `apps/api/src/queue/queue.constants.ts`, add:

```typescript
export const QUEUE_DRIVE_SYNC = 'drive-sync'
```

- [ ] **Step 2: Register the queue in the module**

In `apps/api/src/queue/queue.module.ts`, add the import and register:

Add to the `BullModule.registerQueue()` call:

```typescript
    BullModule.registerQueue(
      { name: QUEUE_GENERATION },
      { name: QUEUE_EXPORT },
      { name: QUEUE_DRIVE_SYNC },
    ),
```

Also update the imports at top to include `QUEUE_DRIVE_SYNC`:

```typescript
import { QUEUE_GENERATION, QUEUE_EXPORT, QUEUE_DRIVE_SYNC, DEFAULT_JOB_OPTIONS } from './queue.constants'
export { QUEUE_GENERATION, QUEUE_EXPORT, QUEUE_DRIVE_SYNC, DEFAULT_JOB_OPTIONS }
```

- [ ] **Step 3: Add drive-sync queue to QueueService stats**

In `apps/api/src/queue/queue.service.ts`, add the injection and include it in stats:

Add to constructor:

```typescript
    @InjectQueue(QUEUE_DRIVE_SYNC) private driveSyncQueue: Queue,
```

Add to the `queues` array in `getStats()`:

```typescript
      { name: QUEUE_DRIVE_SYNC, queue: this.driveSyncQueue },
```

Update the import:

```typescript
import { QUEUE_GENERATION, QUEUE_EXPORT, QUEUE_DRIVE_SYNC } from './queue.constants'
```

Update `getFailedJobs` and `retryFailed` to handle the new queue:

```typescript
  private getQueue(queueName: string): Queue {
    const map: Record<string, Queue> = {
      [QUEUE_GENERATION]: this.generationQueue,
      [QUEUE_EXPORT]: this.exportQueue,
      [QUEUE_DRIVE_SYNC]: this.driveSyncQueue,
    }
    const queue = map[queueName]
    if (!queue) throw new Error(`Unknown queue: ${queueName}`)
    return queue
  }

  async getFailedJobs(queueName: string, start = 0, end = 20) {
    const queue = this.getQueue(queueName)
    const jobs = await queue.getFailed(start, end)
    return jobs.map((j) => ({
      id: j.id,
      name: j.name,
      data: j.data,
      failedReason: j.failedReason,
      attemptsMade: j.attemptsMade,
      timestamp: j.timestamp,
    }))
  }

  async retryFailed(queueName: string, jobId: string) {
    const queue = this.getQueue(queueName)
    const job = await queue.getJob(jobId)
    if (!job) throw new Error(`Job ${jobId} not found in queue ${queueName}`)
    await job.retry()
    return { retried: jobId }
  }
```

- [ ] **Step 4: Create the Bull processor**

Create `apps/api/src/drive-sync/drive-sync.processor.ts`:

```typescript
import { Processor, WorkerHost } from '@nestjs/bullmq'
import { Logger } from '@nestjs/common'
import type { Job } from 'bullmq'
import { QUEUE_DRIVE_SYNC } from '../queue/queue.constants'
import { DriveSyncService } from './drive-sync.service'

@Processor(QUEUE_DRIVE_SYNC)
export class DriveSyncProcessor extends WorkerHost {
  private readonly logger = new Logger(DriveSyncProcessor.name)

  constructor(private readonly syncService: DriveSyncService) {
    super()
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing drive sync job ${job.id}`)
    await this.syncService.runFullSync()
    this.logger.log(`Drive sync job ${job.id} completed`)
  }
}
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/queue/queue.constants.ts apps/api/src/queue/queue.module.ts apps/api/src/queue/queue.service.ts apps/api/src/drive-sync/drive-sync.processor.ts
git commit -m "feat: add drive sync Bull queue, processor, and stats integration"
```

---

## Task 9: Drive Sync Controller

**Files:**
- Create: `apps/api/src/drive-sync/drive-sync.controller.ts`

- [ ] **Step 1: Create the controller**

Create `apps/api/src/drive-sync/drive-sync.controller.ts`:

```typescript
import { Controller, Get, Post, Param, Body } from '@nestjs/common'
import { DriveSyncService } from './drive-sync.service'
import { LinkFolderDto } from './dto/link-folder.dto'

@Controller('drive-sync')
export class DriveSyncController {
  constructor(private readonly syncService: DriveSyncService) {}

  @Post('trigger')
  trigger() {
    return this.syncService.triggerSync()
  }

  @Get('status')
  getStatus() {
    return this.syncService.getStatus()
  }

  @Get('unmatched')
  getUnmatched() {
    return this.syncService.getUnmatchedFolders()
  }

  @Post('folders/:id/link')
  linkFolder(@Param('id') id: string, @Body() dto: LinkFolderDto) {
    return this.syncService.linkFolder(id, dto.productId)
  }

  @Post('folders/:id/reject')
  rejectFolder(@Param('id') id: string) {
    return this.syncService.rejectFolder(id)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/drive-sync/drive-sync.controller.ts
git commit -m "feat: add drive sync REST controller with trigger, status, link, reject"
```

---

## Task 10: Drive Sync Module

**Files:**
- Create: `apps/api/src/drive-sync/drive-sync.module.ts`
- Modify: `apps/api/src/app.module.ts`

- [ ] **Step 1: Create the module**

Create `apps/api/src/drive-sync/drive-sync.module.ts`:

```typescript
import { Module } from '@nestjs/common'
import { DriveSyncController } from './drive-sync.controller'
import { DriveSyncService } from './drive-sync.service'
import { DriveSyncProcessor } from './drive-sync.processor'
import { GoogleDriveService } from './services/google-drive.service'
import { EmbeddingService } from './services/embedding.service'
import { VectorMatchService } from './services/vector-match.service'
import { StorageModule } from '../storage/storage.module'

@Module({
  imports: [StorageModule],
  controllers: [DriveSyncController],
  providers: [
    DriveSyncService,
    DriveSyncProcessor,
    GoogleDriveService,
    EmbeddingService,
    VectorMatchService,
  ],
  exports: [DriveSyncService],
})
export class DriveSyncModule {}
```

- [ ] **Step 2: Register in AppModule**

In `apps/api/src/app.module.ts`, add the import:

```typescript
import { DriveSyncModule } from './drive-sync/drive-sync.module'
```

Add `DriveSyncModule` to the `imports` array of `@Module()`.

- [ ] **Step 3: Verify the API compiles and starts**

```bash
cd apps/api && npx tsc --noEmit --pretty 2>&1 | head -20
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/drive-sync/drive-sync.module.ts apps/api/src/app.module.ts
git commit -m "feat: add DriveSyncModule and register in AppModule"
```

---

## Task 11: Gemini Art Provider

**Files:**
- Create: `apps/api/src/ai/providers/gemini/gemini-art.provider.ts`
- Modify: `apps/api/src/ai/ai.module.ts`

- [ ] **Step 1: Create the art provider**

Create `apps/api/src/ai/providers/gemini/gemini-art.provider.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../../../config/env'

export interface ArtGenerationResult {
  imageBase64: string
  mimeType: string
  model: string
  durationMs: number
}

@Injectable()
export class GeminiArtProvider {
  private readonly logger = new Logger(GeminiArtProvider.name)
  private readonly apiKey: string
  private readonly model: string
  private readonly baseUrl = 'https://generativelanguage.googleapis.com/v1beta'

  constructor(private config: ConfigService<Env>) {
    this.apiKey = this.config.get('GEMINI_API_KEY') ?? ''
    this.model = this.config.get('ART_MODEL') ?? 'gemini-3.1-flash-image-preview'
  }

  async generate(
    prompt: string,
    referenceImages: { base64: string; mimeType: string }[],
  ): Promise<ArtGenerationResult> {
    const start = Date.now()

    const parts: any[] = [{ text: prompt }]
    for (const img of referenceImages) {
      parts.push({
        inlineData: { mimeType: img.mimeType, data: img.base64 },
      })
    }

    const body = {
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
      },
    }

    const response = await fetch(
      `${this.baseUrl}/models/${this.model}:generateContent?key=${this.apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Gemini Art API error ${response.status}: ${err}`)
    }

    const data = await response.json()
    const imagePart = data.candidates?.[0]?.content?.parts?.find((p: any) => p.inlineData)
    if (!imagePart) throw new Error('No image in Gemini Art response')

    return {
      imageBase64: imagePart.inlineData.data,
      mimeType: imagePart.inlineData.mimeType ?? 'image/png',
      model: this.model,
      durationMs: Date.now() - start,
    }
  }
}
```

- [ ] **Step 2: Register in AiModule**

In `apps/api/src/ai/ai.module.ts`, add the import and include in providers/exports:

```typescript
import { GeminiArtProvider } from './providers/gemini/gemini-art.provider'
```

Add `GeminiArtProvider` to both the `providers` and `exports` arrays.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/ai/providers/gemini/gemini-art.provider.ts apps/api/src/ai/ai.module.ts
git commit -m "feat: add Gemini 3.1 Flash art generation provider"
```

---

## Task 12: Art Composer Service

**Files:**
- Create: `apps/api/src/sales-sheets/services/art-composer.service.ts`
- Modify: `apps/api/src/sales-sheets/sales-sheets.module.ts`
- Modify: `apps/api/src/sales-sheets/sales-sheets.controller.ts`

- [ ] **Step 1: Create the art composer service**

Create `apps/api/src/sales-sheets/services/art-composer.service.ts`:

```typescript
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { GeminiArtProvider } from '../../ai/providers/gemini/gemini-art.provider'
import { StorageService } from '../../storage/storage.service'

@Injectable()
export class ArtComposerService {
  private readonly logger = new Logger(ArtComposerService.name)

  constructor(
    private prisma: PrismaClient,
    private artProvider: GeminiArtProvider,
    private storage: StorageService,
  ) {}

  async generateArt(
    salesSheetId: string,
    refinementPrompt?: string,
  ): Promise<{ artImageUrl: string; artImageKey: string }> {
    // Load sales sheet with latest version, product, and template
    const salesSheet = await this.prisma.salesSheet.findUnique({
      where: { id: salesSheetId },
      include: {
        product: {
          include: {
            images: { orderBy: { order: 'asc' } },
            benefits: { orderBy: { order: 'asc' } },
            specifications: true,
          },
        },
        template: true,
        versions: {
          orderBy: { versionNumber: 'desc' },
          take: 1,
        },
      },
    })

    if (!salesSheet) throw new NotFoundException(`Sales sheet ${salesSheetId} not found`)
    const version = salesSheet.versions[0]
    if (!version) throw new NotFoundException('No version found')

    // Load product images as base64
    const referenceImages: { base64: string; mimeType: string }[] = []
    for (const img of salesSheet.product.images.slice(0, 4)) {
      try {
        const buffer = await this.storage.getBuffer(img.url)
        referenceImages.push({
          base64: buffer.toString('base64'),
          mimeType: 'image/png',
        })
      } catch {
        this.logger.warn(`Could not load product image: ${img.url}`)
      }
    }

    // Build prompt
    const content = version.content as any
    const prompt = this.buildPrompt(
      salesSheet.product.name,
      content,
      salesSheet.template?.zonesConfig as any,
      salesSheet.product.benefits.map((b) => b.text),
      refinementPrompt,
    )

    // Generate art
    const result = await this.artProvider.generate(prompt, referenceImages)

    // Save to MinIO
    const imageBuffer = Buffer.from(result.imageBase64, 'base64')
    const ext = result.mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const storageKey = `art/sales-sheets/${salesSheetId}/v${version.versionNumber}-${Date.now()}.${ext}`
    await this.storage.upload(storageKey, imageBuffer, result.mimeType, 'image')

    // Update version
    await this.prisma.salesSheetVersion.update({
      where: { id: version.id },
      data: {
        artImageKey: storageKey,
        artGeneratedAt: new Date(),
      },
    })

    const artImageUrl = await this.storage.getPresignedUrl(storageKey)

    return { artImageUrl, artImageKey: storageKey }
  }

  private buildPrompt(
    productName: string,
    content: any,
    zonesConfig: any,
    benefits: string[],
    refinementPrompt?: string,
  ): string {
    const headline = content?.headline ?? ''
    const subtitle = content?.subtitle ?? ''
    const benefitsList = (content?.benefits ?? benefits).join(', ')

    let prompt = `Crie uma lâmina de vendas profissional para o produto "${productName}".

CONTEÚDO:
- Headline: ${headline}
- Subtítulo: ${subtitle}
- Benefícios: ${benefitsList}

DIRETRIZES DE DESIGN:
- Layout limpo e moderno, estilo corporativo
- Use as imagens do produto fornecidas como elemento central
- Fundo escuro (#111827) com elementos em branco e amarelo (#F59E0B) como cor de destaque
- Tipografia clara e hierárquica
- Inclua o headline em destaque, os benefícios listados, e a imagem do produto em evidência
- Formato: A4 retrato (595 × 842 pt)
- A arte deve estar pronta para impressão e uso comercial`

    if (refinementPrompt) {
      prompt += `\n\nAJUSTES SOLICITADOS:\n${refinementPrompt}`
    }

    return prompt
  }
}
```

- [ ] **Step 2: Update SalesSheetsModule**

In `apps/api/src/sales-sheets/sales-sheets.module.ts`, add:

```typescript
import { ArtComposerService } from './services/art-composer.service'
import { AiModule } from '../ai/ai.module'
import { StorageModule } from '../storage/storage.module'
```

Add `AiModule` and `StorageModule` to imports, and `ArtComposerService` to providers and exports.

- [ ] **Step 3: Add generate-art endpoint to controller**

In `apps/api/src/sales-sheets/sales-sheets.controller.ts`, add:

```typescript
import { ArtComposerService } from './services/art-composer.service'
```

Add to constructor:

```typescript
    private readonly artComposer: ArtComposerService,
```

Add endpoint:

```typescript
  @Post(':id/generate-art')
  generateArt(@Param('id') id: string, @Body() body: { prompt?: string }) {
    return this.artComposer.generateArt(id, body.prompt)
  }
```

- [ ] **Step 4: Verify compilation**

```bash
cd apps/api && npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/sales-sheets/services/art-composer.service.ts apps/api/src/sales-sheets/sales-sheets.module.ts apps/api/src/sales-sheets/sales-sheets.controller.ts
git commit -m "feat: add art composer service and generate-art endpoint"
```

---

## Task 13: Frontend — Drive Sync Hooks

**Files:**
- Create: `apps/web/lib/hooks/use-drive-sync.ts`

- [ ] **Step 1: Create TanStack Query hooks**

Create `apps/web/lib/hooks/use-drive-sync.ts`:

```typescript
'use client'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface SyncStatus {
  isRunning: boolean
  lastSyncAt: string | null
  nextSyncAt: string | null
  stats: {
    totalFolders: number
    matchedFolders: number
    unmatchedFolders: number
    totalImages: number
    syncedImages: number
  }
  lastError: string | null
}

export interface UnmatchedFolder {
  id: string
  driveId: string
  name: string
  matchScore: number | null
  suggestedProduct: { id: string; name: string; sku: string } | null
  imageCount: number
  createdAt: string
}

export function useDriveSyncStatus() {
  return useQuery<SyncStatus>({
    queryKey: ['drive-sync-status'],
    queryFn: () => apiFetch('/drive-sync/status'),
    refetchInterval: 5000,
  })
}

export function useUnmatchedFolders() {
  return useQuery<UnmatchedFolder[]>({
    queryKey: ['drive-sync-unmatched'],
    queryFn: () => apiFetch('/drive-sync/unmatched'),
  })
}

export function useTriggerSync() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      apiFetch('/drive-sync/trigger', { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive-sync-status'] })
    },
  })
}

export function useLinkFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ folderId, productId }: { folderId: string; productId: string }) =>
      apiFetch(`/drive-sync/folders/${folderId}/link`, {
        method: 'POST',
        body: JSON.stringify({ productId }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive-sync-unmatched'] })
      qc.invalidateQueries({ queryKey: ['drive-sync-status'] })
    },
  })
}

export function useRejectFolder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (folderId: string) =>
      apiFetch(`/drive-sync/folders/${folderId}/reject`, { method: 'POST' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['drive-sync-unmatched'] })
      qc.invalidateQueries({ queryKey: ['drive-sync-status'] })
    },
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/lib/hooks/use-drive-sync.ts
git commit -m "feat: add TanStack Query hooks for drive sync API"
```

---

## Task 14: Frontend — Drive Sync Page

**Files:**
- Create: `apps/web/app/drive-sync/page.tsx`
- Create: `apps/web/app/drive-sync/drive-sync-client.tsx`

- [ ] **Step 1: Create server page**

Create `apps/web/app/drive-sync/page.tsx`:

```tsx
import { AppShell } from '@/components/layout/app-shell'
import { DriveSyncClient } from './drive-sync-client'

export default function DriveSyncPage() {
  return (
    <AppShell>
      <DriveSyncClient />
    </AppShell>
  )
}
```

- [ ] **Step 2: Create client component**

Create `apps/web/app/drive-sync/drive-sync-client.tsx`:

```tsx
'use client'

import { useState } from 'react'
import {
  useDriveSyncStatus,
  useUnmatchedFolders,
  useTriggerSync,
  useLinkFolder,
  useRejectFolder,
} from '@/lib/hooks/use-drive-sync'
import { useProducts } from '@/lib/hooks/use-products'
import {
  RefreshCw, Loader2, CheckCircle2, XCircle, FolderSync,
  Link2, Ban, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export function DriveSyncClient() {
  const { data: status, isLoading: statusLoading } = useDriveSyncStatus()
  const { data: unmatched, isLoading: unmatchedLoading } = useUnmatchedFolders()
  const { mutateAsync: triggerSync, isPending: syncing } = useTriggerSync()
  const { data: products } = useProducts({ isActive: true } as any)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Google Drive Sync</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sincronize imagens de produtos do Google Drive
          </p>
        </div>
        <button
          onClick={() => triggerSync()}
          disabled={syncing || status?.isRunning}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {syncing || status?.isRunning ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Sincronizando...</>
          ) : (
            <><RefreshCw className="h-4 w-4" /> Sincronizar agora</>
          )}
        </button>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Pastas" value={status.stats.totalFolders} />
          <StatCard label="Vinculadas" value={status.stats.matchedFolders} color="text-green-400" />
          <StatCard label="Pendentes" value={status.stats.unmatchedFolders} color="text-yellow-400" />
          <StatCard label="Imagens sincronizadas" value={status.stats.syncedImages} color="text-blue-400" />
        </div>
      )}

      {/* Last sync info */}
      {status && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">Último sync:</span>
            <span>{status.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString('pt-BR') : 'Nunca'}</span>
            {status.lastError && (
              <span className="text-destructive ml-auto">Erro: {status.lastError}</span>
            )}
          </div>
        </div>
      )}

      {/* Unmatched Folders Table */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Pastas não vinculadas</h2>
        {unmatchedLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
          </div>
        ) : !unmatched?.length ? (
          <p className="text-sm text-muted-foreground">Nenhuma pasta pendente de vinculação.</p>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/10">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pasta no Drive</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Sugestão</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Imagens</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Ações</th>
                </tr>
              </thead>
              <tbody>
                {unmatched.map((folder) => (
                  <UnmatchedRow
                    key={folder.id}
                    folder={folder}
                    products={products?.data ?? []}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, color }: { label: string; value: number; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={cn('text-2xl font-bold mt-1', color)}>{value}</p>
    </div>
  )
}

function UnmatchedRow({
  folder,
  products,
}: {
  folder: { id: string; name: string; matchScore: number | null; suggestedProduct: { id: string; name: string; sku: string } | null; imageCount: number }
  products: { id: string; name: string; sku: string }[]
}) {
  const [selectedProductId, setSelectedProductId] = useState(folder.suggestedProduct?.id ?? '')
  const { mutateAsync: linkFolder, isPending: linking } = useLinkFolder()
  const { mutateAsync: rejectFolder, isPending: rejecting } = useRejectFolder()

  return (
    <tr className="border-b border-border last:border-0">
      <td className="px-4 py-3 font-medium">{folder.name}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {folder.suggestedProduct ? (
          <span>{folder.suggestedProduct.name} <span className="text-xs">({folder.suggestedProduct.sku})</span></span>
        ) : '—'}
      </td>
      <td className="px-4 py-3">
        {folder.matchScore !== null ? (
          <span className={cn(
            'text-xs font-mono px-1.5 py-0.5 rounded',
            folder.matchScore >= 0.75 ? 'bg-green-400/10 text-green-400' :
            folder.matchScore >= 0.5 ? 'bg-yellow-400/10 text-yellow-400' :
            'bg-red-400/10 text-red-400',
          )}>
            {(folder.matchScore * 100).toFixed(0)}%
          </span>
        ) : '—'}
      </td>
      <td className="px-4 py-3 text-muted-foreground">{folder.imageCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-2">
          <select
            value={selectedProductId}
            onChange={(e) => setSelectedProductId(e.target.value)}
            className="w-48 rounded border border-border bg-background px-2 py-1.5 text-xs outline-none"
          >
            <option value="">Selecionar produto...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
            ))}
          </select>
          <button
            onClick={() => selectedProductId && linkFolder({ folderId: folder.id, productId: selectedProductId })}
            disabled={!selectedProductId || linking}
            className="rounded bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:opacity-50"
          >
            {linking ? <Loader2 className="h-3 w-3 animate-spin" /> : <Link2 className="h-3 w-3" />}
          </button>
          <button
            onClick={() => rejectFolder(folder.id)}
            disabled={rejecting}
            className="rounded border border-border px-3 py-1.5 text-xs text-muted-foreground hover:text-destructive disabled:opacity-50"
          >
            {rejecting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Ban className="h-3 w-3" />}
          </button>
        </div>
      </td>
    </tr>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/app/drive-sync/
git commit -m "feat: add Drive Sync admin page with status, trigger, and folder linking UI"
```

---

## Task 15: Sidebar — Add Google Drive Nav Item

**Files:**
- Modify: `apps/web/components/layout/sidebar.tsx`

- [ ] **Step 1: Add FolderSync icon import**

In `apps/web/components/layout/sidebar.tsx`, add `FolderSync` to the lucide-react imports:

```typescript
import {
  LayoutDashboard, Layers, Presentation, Library,
  Package, CheckSquare, Image, FileSliders, Wand2, Activity, FolderSync,
} from 'lucide-react'
```

- [ ] **Step 2: Add nav item to Admin section**

In the `navSections` array, add to the `Admin` section items:

```typescript
      { href: '/drive-sync', icon: FolderSync, label: 'Google Drive' },
```

Add it after the `Jobs` entry.

- [ ] **Step 3: Commit**

```bash
git add apps/web/components/layout/sidebar.tsx
git commit -m "feat: add Google Drive link to sidebar admin section"
```

---

## Task 16: Frontend — Art Generation in Sales Sheet Detail

**Files:**
- Create: `apps/web/lib/hooks/use-art.ts`
- Modify: `apps/web/app/sales-sheets/[id]/page.tsx` (or the detail client component)

- [ ] **Step 1: Create art hook**

Create `apps/web/lib/hooks/use-art.ts`:

```typescript
'use client'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api'

export interface ArtResult {
  artImageUrl: string
  artImageKey: string
}

export function useGenerateArt() {
  const qc = useQueryClient()
  return useMutation<ArtResult, Error, { salesSheetId: string; prompt?: string }>({
    mutationFn: ({ salesSheetId, prompt }) =>
      apiFetch(`/sales-sheets/${salesSheetId}/generate-art`, {
        method: 'POST',
        body: JSON.stringify({ prompt }),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['sales-sheet', vars.salesSheetId] })
    },
  })
}
```

- [ ] **Step 2: Add art generation UI to sales sheet detail page**

Find the sales sheet detail client component (likely `apps/web/app/sales-sheets/[id]/sales-sheet-detail.tsx` or similar) and add an "Art" section. The exact location depends on existing code structure, but the pattern is:

```tsx
// Import at top:
import { useGenerateArt } from '@/lib/hooks/use-art'
import { Wand2, Loader2 } from 'lucide-react'

// Inside the component, add state and hook:
const [artPrompt, setArtPrompt] = useState('')
const { mutateAsync: generateArt, isPending: generatingArt, data: artResult } = useGenerateArt()

// Add this section in the JSX (after existing content):
<div className="rounded-lg border border-border bg-card p-4 mt-4">
  <h3 className="text-sm font-semibold mb-3">Arte Final</h3>

  {/* Show existing art if available */}
  {version?.artImageKey && (
    <div className="mb-4">
      <img
        src={artResult?.artImageUrl ?? `/api/storage/${version.artImageKey}`}
        alt="Arte gerada"
        className="rounded-lg max-h-96 object-contain"
      />
    </div>
  )}

  <div className="flex gap-2">
    <input
      type="text"
      value={artPrompt}
      onChange={(e) => setArtPrompt(e.target.value)}
      placeholder="Ajustes opcionais (ex: mais destaque no produto)..."
      className="flex-1 rounded border border-border bg-background px-3 py-2 text-sm outline-none"
    />
    <button
      onClick={() => generateArt({ salesSheetId: id, prompt: artPrompt || undefined })}
      disabled={generatingArt}
      className="flex items-center gap-2 rounded bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
    >
      {generatingArt ? (
        <><Loader2 className="h-4 w-4 animate-spin" /> Gerando...</>
      ) : (
        <><Wand2 className="h-4 w-4" /> Gerar Arte</>
      )}
    </button>
  </div>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/lib/hooks/use-art.ts apps/web/app/sales-sheets/
git commit -m "feat: add art generation UI to sales sheet detail page"
```

---

## Task 17: Cron Setup for Periodic Sync

**Files:**
- Modify: `apps/api/src/drive-sync/drive-sync.module.ts`
- Modify: `apps/api/src/drive-sync/drive-sync.service.ts`

- [ ] **Step 1: Add cron-based sync scheduling**

In `apps/api/src/drive-sync/drive-sync.service.ts`, add the `OnModuleInit` interface and cron scheduling using Bull's repeatable jobs:

Add imports:

```typescript
import { InjectQueue } from '@nestjs/bullmq'
import type { Queue } from 'bullmq'
import { QUEUE_DRIVE_SYNC } from '../queue/queue.constants'
import { OnModuleInit } from '@nestjs/common'
```

Implement `OnModuleInit`:

```typescript
@Injectable()
export class DriveSyncService implements OnModuleInit {
  // ... existing fields

  constructor(
    // ... existing deps
    @InjectQueue(QUEUE_DRIVE_SYNC) private syncQueue: Queue,
  ) {
    this.rootFolderId = this.config.get('GOOGLE_DRIVE_ROOT_FOLDER_ID') ?? ''
  }

  async onModuleInit() {
    const cron = this.config.get('DRIVE_SYNC_CRON') ?? '0 3 * * *'
    // Remove old repeatable jobs
    const existing = await this.syncQueue.getRepeatableJobs()
    for (const job of existing) {
      await this.syncQueue.removeRepeatableByKey(job.key)
    }
    // Add new repeatable job
    await this.syncQueue.add('drive-sync-cron', {}, { repeat: { pattern: cron } })
    this.logger.log(`Drive sync cron scheduled: ${cron}`)
  }
```

- [ ] **Step 2: Update DriveSyncModule imports**

In `apps/api/src/drive-sync/drive-sync.module.ts`, ensure the QueueModule (or BullModule) is imported so `@InjectQueue` works. Since `QueueModule` is `@Global()`, this should already work. No changes needed if the queue module is global.

- [ ] **Step 3: Verify compilation**

```bash
cd apps/api && npx tsc --noEmit --pretty 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/drive-sync/drive-sync.service.ts
git commit -m "feat: add cron-based periodic Drive sync via Bull repeatable jobs"
```

---

## Task 18: Integration Test — Full Sync Flow

**Files:**
- Modify or create appropriate test file

- [ ] **Step 1: Manually test the sync trigger**

Start the API:

```bash
cd apps/api && npm run dev
```

Test the trigger endpoint:

```bash
curl -X POST http://localhost:4000/api/drive-sync/trigger
```

Expected: `{"message":"Sync started"}`

- [ ] **Step 2: Check sync status**

```bash
curl http://localhost:4000/api/drive-sync/status
```

Expected: JSON with `isRunning`, `stats`, `lastSyncAt`

- [ ] **Step 3: Check unmatched folders**

```bash
curl http://localhost:4000/api/drive-sync/unmatched
```

Expected: JSON array of unmatched folders with suggestions

- [ ] **Step 4: Test manual linking**

Pick a folder ID and product ID from the above results:

```bash
curl -X POST http://localhost:4000/api/drive-sync/folders/<FOLDER_ID>/link \
  -H 'Content-Type: application/json' \
  -d '{"productId":"<PRODUCT_ID>"}'
```

- [ ] **Step 5: Test art generation**

```bash
curl -X POST http://localhost:4000/api/sales-sheets/<SALES_SHEET_ID>/generate-art \
  -H 'Content-Type: application/json' \
  -d '{}'
```

Expected: JSON with `artImageUrl` and `artImageKey`

- [ ] **Step 6: Verify in frontend**

Open `http://localhost:3000/drive-sync` and verify:
- Status cards show correct numbers
- "Sincronizar agora" button works
- Unmatched folders table shows suggestions
- Manual linking works

- [ ] **Step 7: Commit any fixes**

```bash
git add -A
git commit -m "fix: integration fixes for drive sync and art generation"
```
