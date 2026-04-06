# Google Drive Sync + Art Composition Pipeline

**Date:** 2026-04-05
**Status:** Approved

## Overview

Integrate Google Drive as the source of truth for product images. A sync pipeline scans a shared Drive folder, matches subfolders to products via vector similarity (pgvector + Gemini embeddings), downloads images to MinIO, and keeps the database in sync. A new art composition step uses `gemini-3.1-flash-image-preview` to generate final sales sheet artwork from real product images + AI-generated content.

## 1. Data Architecture

### New Postgres Extension

- `pgvector` — vector similarity search

### New Tables

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

model DriveFolder {
  id           String           @id @default(cuid())
  driveId      String           @unique // Google Drive folder ID
  name         String           // folder name as-is from Drive
  embedding    Unsupported("vector(256)")? // embedding of folder name
  productId    String?          // linked product (null = unlinked)
  matchScore   Float?           // confidence score from auto-matching
  matchStatus  DriveMatchStatus @default(UNMATCHED)
  lastSyncedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  product Product?      @relation(fields: [productId], references: [id])
  images  DriveImage[]

  @@index([productId])
  @@index([matchStatus])
}

model DriveImage {
  id              String          @id @default(cuid())
  driveId         String          @unique // Google Drive file ID
  driveFolderId   String
  fileName        String
  mimeType        String
  driveModifiedAt DateTime        // last modified in Drive
  storageKey      String?         // MinIO key (null = not yet downloaded)
  syncStatus      DriveSyncStatus @default(PENDING)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  folder       DriveFolder    @relation(fields: [driveFolderId], references: [id], onDelete: Cascade)
  productImage ProductImage?

  @@index([driveFolderId])
  @@index([syncStatus])
}
```

### Modified Tables

**ProductImage** — add optional origin tracking:
```prisma
model ProductImage {
  // ... existing fields
  driveImageId String?    @unique
  driveImage   DriveImage? @relation(fields: [driveImageId], references: [id])
}
```

**Product** — add embedding for matching:
```prisma
model Product {
  // ... existing fields
  embedding Unsupported("vector(256)")?
  driveFolders DriveFolder[]
}
```

**SalesSheetVersion** — add art composition fields:
```prisma
model SalesSheetVersion {
  // ... existing fields
  artImageKey    String?   // MinIO key for the generated art
  artGeneratedAt DateTime?
}
```

## 2. Sync Pipeline

Three-stage pipeline executed as Bull queue jobs:

### Stage 1 — Drive Scan

1. Authenticate with service account (`botcriador@sqddgtl.iam.gserviceaccount.com`)
2. List all subfolders under root folder (`16X3WZRaYQndX18rBN-xFplrmFg-W6LN9`)
3. For each subfolder: upsert `DriveFolder` record (by `driveId`)
4. List image files (JPEG, PNG, WebP) inside each folder → upsert `DriveImage`
5. Mark `DriveImage` records not found in Drive as `DELETED`
6. Mark `DriveFolder` records not found in Drive for cleanup

### Stage 2 — Matching (unlinked folders only)

1. Generate embedding for folder name via `gemini-embedding-2-preview` (256 dimensions)
2. Generate/update embeddings for products that don't have one yet (product name + SKU concatenated)
3. Query pgvector for nearest product using cosine similarity (`<=>` operator)
4. If score >= 0.75 → set `AUTO_MATCHED`, link to product
5. If score < 0.75 → set `UNMATCHED`, appears in admin panel for manual linking

### Stage 3 — Image Download

1. For matched folders (`AUTO_MATCHED` or `MANUAL_MATCHED`):
   - Download new/modified images from Drive → MinIO
   - Create/update `ProductImage` with `driveImageId` reference
   - Remove `ProductImage` entries whose `DriveImage` is marked `DELETED`
2. First image (alphabetical, or containing "pack" in filename) → `isPrimary = true`

### Scheduling

- **Cron:** Configurable via `DRIVE_SYNC_CRON` env var (default: `0 3 * * *` — 3 AM daily)
- **Manual:** `POST /api/drive-sync/trigger` (admin only, one sync at a time)

## 3. Art Composition Pipeline

Uses `gemini-3.1-flash-image-preview` to generate final sales sheet artwork.

### Flow

```
Product images (from Drive sync)
        ↓
AI-generated content (existing pipeline)
        ↓
Template layout config (existing)
        ↓
ArtComposerService
  → Builds prompt: layout instructions + brand guidelines + textual content
  → Sends to gemini-3.1-flash-image-preview with product images as input
  → Receives generated artwork image
        ↓
Save to MinIO → update SalesSheetVersion.artImageKey
```

### ArtComposerService

- **Input:** product images (Buffer[]), textual content (JSON from existing pipeline), template zones config, brand assets
- **Prompt construction:** Describes desired layout, color palette, typography rules, zone placement, and brand guidelines
- **Model:** `gemini-3.1-flash-image-preview`
- **Output resolution:** 2K default (configurable)
- **Re-generation:** Supports conversational editing — user sends additional prompt to refine the art

### Endpoint

```
POST /api/sales-sheets/:id/generate-art
Body: { prompt?: string }  // optional refinement prompt
Response: { artImageUrl: string, artImageKey: string }
```

## 4. API Endpoints

### Drive Sync

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/drive-sync/trigger` | Trigger manual sync | ADMIN |
| GET | `/api/drive-sync/status` | Last sync status + progress | ADMIN |
| GET | `/api/drive-sync/unmatched` | List unmatched folders | ADMIN |
| POST | `/api/drive-sync/folders/:id/link` | Manual link folder → product | ADMIN |
| POST | `/api/drive-sync/folders/:id/reject` | Reject folder (not a product) | ADMIN |

### Art Composition

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/api/sales-sheets/:id/generate-art` | Generate/regenerate artwork | Authenticated |

## 5. Frontend

### New Page: `/drive-sync` (Admin only)

**Status card:**
- Last sync timestamp
- Next scheduled sync
- Totals: folders scanned, matched, unmatched, images synced

**Sync button:** "Sincronizar agora" — disabled while sync is running, shows progress

**Unmatched folders table:**
- Folder name (from Drive)
- Suggested product match (with confidence score %)
- Product dropdown for manual linking
- Reject button

**Sidebar:** New item "Google Drive" under admin section with badge showing unmatched count.

### Sales Sheet Detail: Art Preview

- Shows generated art image when available
- "Gerar Arte" button to trigger art composition
- Text input for refinement prompts
- Re-generate button for iterative editing

## 6. Configuration

### Environment Variables

```env
# Google Drive
GOOGLE_SERVICE_ACCOUNT_EMAIL=botcriador@sqddgtl.iam.gserviceaccount.com
GOOGLE_SERVICE_ACCOUNT_KEY=<private key - never committed>
GOOGLE_DRIVE_ROOT_FOLDER_ID=16X3WZRaYQndX18rBN-xFplrmFg-W6LN9

# Sync
DRIVE_SYNC_CRON=0 3 * * *
DRIVE_SYNC_MATCH_THRESHOLD=0.75

# Embeddings
EMBEDDING_MODEL=gemini-embedding-2-preview
EMBEDDING_DIMENSIONS=256

# Art Composition
ART_MODEL=gemini-3.1-flash-image-preview
ART_DEFAULT_RESOLUTION=2K
```

### Dependencies

- `googleapis` — Google Drive API client
- `pgvector` — Postgres extension + Prisma support

## 7. Security

- Drive sync endpoints restricted to `ADMIN` role
- Service account private key stored as env var only (never in git)
- Rate limit on manual trigger: rejects if sync already running
- Drive API uses read-only scope (`drive.readonly`)
- Images served via MinIO signed URLs (existing pattern)
