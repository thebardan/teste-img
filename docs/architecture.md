# Architecture — Multi AI Studio

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser / User                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────────────┐
│                    Next.js (Web App)                            │
│  App Router + Server Components + Client Hooks                  │
│  NextAuth (Google OAuth) → session JWT                          │
│  middleware.ts → route protection                               │
│  apiFetch → X-Api-Key + X-User-Email + X-User-Role             │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (internal)
┌───────────────────────────▼─────────────────────────────────────┐
│                    NestJS API                                   │
│  ┌─────────────┐  ┌──────────────┐  ┌────────────────────────┐ │
│  │ ApiKeyGuard │  │  RolesGuard  │  │  RequestIdMiddleware   │ │
│  │ (X-Api-Key) │  │ (x-user-role)│  │  LoggingInterceptor   │ │
│  └─────────────┘  └──────────────┘  │  HttpExceptionFilter  │ │
│                                     └────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Domain Modules                        │  │
│  │  Products │ BrandAssets │ SalesSheets │ Presentations   │  │
│  │  Templates │ Exports │ Approvals │ QA │ Queue │ Users   │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    AI Layer                              │  │
│  │  GeminiTextProvider │ GeminiImageProvider               │  │
│  │  PromptEngineService (versioned prompt templates)        │  │
│  │  Agents: Copywriter │ BrandGuardian │ VisualDirector    │  │
│  │          QA │ SlideStrategist │ SlideComposer           │  │
│  └──────────────────────────────────────────────────────────┘  │
└──────┬──────────────┬────────────────┬────────────────┬─────────┘
       │              │                │                │
┌──────▼─────┐ ┌──────▼─────┐ ┌──────▼─────┐ ┌───────▼──────┐
│ PostgreSQL  │ │   Redis    │ │   MinIO    │ │   Gemini     │
│ (Prisma)   │ │  (BullMQ)  │ │ (Storage)  │ │  (External)  │
└────────────┘ └────────────┘ └────────────┘ └──────────────┘
```

## Domain Model Overview

```
User (ADMIN | EDITOR | VIEWER | APPROVER)
  ├── SalesSheet
  │     ├── SalesSheetVersion (content JSON, versionNumber)
  │     │     ├── ExportedArtifact (PDF/PNG)
  │     │     └── InferenceLog (prompt + response records)
  │     └── Approval (status, comment)
  ├── Presentation
  │     ├── PresentationVersion
  │     │     ├── PresentationSlide (order, content JSON)
  │     │     └── ExportedArtifact (PPTX/PDF)
  │     └── Approval
  └── AuditLog

Product
  ├── ProductImage
  ├── ProductSpecification
  ├── ProductBenefit
  ├── ProductLink
  ├── ProductClaim
  └── ProductVariant

BrandAsset (logos, icons)
  └── BrandRule (condition, score, contrastBackground)

Template (SALES_SHEET_* | DECK_*)
  └── TemplateVariant

Client
GenerationJob
PromptTemplate
```

## Generation Flow — Sales Sheet

```
POST /api/sales-sheets/generate
  │
  ├── Load Product (images, benefits, specs)
  ├── SalesCopywriterAgent.generate(product data)
  │     └── GeminiTextProvider → headline, subtitle, benefits, CTA
  ├── VisualDirectorAgent.direct(product, headline)
  │     └── GeminiTextProvider → style, colors, background suggestion
  ├── BrandGuardianAgent.selectLogo(background)
  │     └── BrandAssetsService.selectBest() → highest-score logo
  ├── [Optional] GeminiImageProvider → creative visual asset
  ├── Compose content JSON (deterministic zone layout)
  └── Persist SalesSheet + SalesSheetVersion(1)
```

## Generation Flow — Presentation

```
POST /api/presentations/generate
  │
  ├── Load Products + Client
  ├── PromptEngine.run('slide-structure', context)
  │     └── Returns 5-slide scaffold (type, title, subtitle, body, cta)
  ├── For each of 5 slides:
  │     └── PromptEngine.run('slide-copy', { slideType, context })
  │           └── Enriches title, subtitle, body bullets
  ├── BrandGuardianAgent.selectLogo(background)
  ├── Compose slide content JSONs (deterministic)
  └── Persist Presentation + PresentationVersion(1) + 5 PresentationSlides
```

## Export Flow

```
POST /api/exports/presentation/:id/pptx
  │
  ├── Load PresentationVersion with Slides
  ├── PptxComposerService.compose(title, slides)
  │     └── PptxGenJS → Buffer
  ├── StorageService.upload(key, buffer, mimeType)
  │     └── validate (MIME allow-list, size limit) → MinIO
  └── Persist ExportedArtifact (storageKey, sizeBytes)

POST /api/exports/sales-sheet/:id/pdf
  │
  ├── Load SalesSheetVersion
  ├── PdfComposerService.composeSalesSheet(content, template)
  │     └── PDFKit → Buffer
  ├── StorageService.upload(...)
  └── Persist ExportedArtifact
```

## Approval Workflow

```
DRAFT → [user submits] → IN_REVIEW → [approver acts] → APPROVED
                                                       ↘ REJECTED → (edit + resubmit)
APPROVED → ARCHIVED
```

States map to `SalesSheetStatus` / `PresentationStatus` enums in Prisma.

## Queue Architecture

```
generation queue (BullMQ)
  ├── default: 3 attempts, exponential backoff (2s base)
  ├── removeOnComplete: keep last 100
  └── removeOnFail: keep last 50

export queue (BullMQ)
  └── same defaults
```

Monitor: `GET /api/queues/stats`
Failed jobs: `GET /api/queues/generation/failed`
Retry: `POST /api/queues/generation/jobs/:id/retry` (ADMIN only)

## Security Architecture

```
Browser
  └── Google OAuth → NextAuth session JWT
        └── middleware.ts checks token on every request
              └── Redirects to /auth/signin if missing

Next.js → NestJS
  └── X-Api-Key: <API_SECRET>      — shared secret, validates origin
  └── X-User-Email: user@domain    — forwarded from session
  └── X-User-Role: EDITOR          — fetched from DB on first login
        └── ApiKeyGuard: validates secret (dev bypass if unset)
        └── RolesGuard: enforces @Roles() constraints
        └── @CurrentUser(): extracts email + role from headers

Upload security
  └── StorageService.validateUpload()
        ├── Images: allow-list [jpeg, png, webp, gif, svg] ≤ 20MB
        └── Documents: allow-list [pdf, pptx] ≤ 100MB
```

## Observability

Every request gets a UUID via `RequestIdMiddleware`:
- `X-Request-Id` is set on the response
- Included in all log lines: `[req-uuid] GET /api/products → 200 (14ms)`
- Included in error envelopes: `{ requestId: "...", statusCode: 404, ... }`

Structured error format:
```json
{
  "statusCode": 404,
  "error": "Not Found",
  "message": "Product abc not found",
  "requestId": "a1b2c3d4-...",
  "path": "/api/products/abc",
  "timestamp": "2026-04-05T10:00:00.000Z"
}
```
