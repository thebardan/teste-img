# Module Reference

## Backend Modules (`apps/api/src/`)

### `AuthModule`
Global auth guards applied to every route.
- `ApiKeyGuard` — validates `X-Api-Key` header against `API_SECRET`
- `RolesGuard` — enforces `@Roles()` decorator constraints from `x-user-role` header
- `@Public()` — decorator to bypass auth (used on `/api/health`)
- `@Roles(...roles)` — restrict a route to specific user roles
- `@CurrentUser()` — param decorator to extract user context

### `UsersModule`
- `GET /api/users/by-email?email=` — role lookup for NextAuth JWT callback

### `ProductsModule`
- `GET /api/products` — paginated list with filters (category, brand, search, isActive)
- `GET /api/products/:id` — full product detail including images, specs, benefits
- `GET /api/products/categories` — distinct category list
- `GET /api/products/brands` — distinct brand list

### `BrandAssetsModule`
- `GET /api/brand-assets` — all active brand assets (logos, icons)
- `GET /api/brand-assets/:id` — asset detail with rules
- `selectBest(background)` — internal method for automatic logo selection

### `SalesSheetsModule`
- `GET /api/sales-sheets` — paginated list
- `GET /api/sales-sheets/:id` — detail with all versions and approvals
- `POST /api/sales-sheets/generate` — trigger AI generation pipeline
- `PATCH /api/sales-sheets/:id/status` — update status

### `PresentationsModule`
- `GET /api/presentations` — paginated list
- `GET /api/presentations/:id` — detail with slides
- `POST /api/presentations/generate` — trigger generation
- `PATCH /api/presentations/:id/status` — update status

### `ClientsModule`
- `GET /api/clients` — list all clients
- `GET /api/clients/:id` — client detail

### `TemplatesModule`
- `GET /api/templates` — list templates (filter by type, activeOnly)
- `GET /api/templates/:id` — template with variants
- `POST /api/templates` — create template (**ADMIN** only)
- `PATCH /api/templates/:id` — update template (**ADMIN** only)
- `DELETE /api/templates/:id` — delete template (**ADMIN** only)
- `POST /api/templates/:id/variants` — add variant
- `DELETE /api/templates/:id/variants/:variantId` — remove variant

### `ExportsModule`
- `POST /api/exports/sales-sheet/:id/pdf` — export sales sheet PDF
- `POST /api/exports/presentation/:id/pptx` — export presentation PPTX
- `POST /api/exports/presentation/:id/pdf` — export presentation PDF
- `GET /api/exports/artifact/:id/download` — presigned download URL
- `GET /api/exports/sales-sheet/:id/artifacts` — list artifacts for sheet
- `GET /api/exports/presentation/:id/artifacts` — list artifacts for presentation

### `ApprovalsModule`
- `GET /api/approvals/pending` — all items in `IN_REVIEW` state
- `GET /api/approvals` — all approvals (filter by status)
- `POST /api/approvals/sales-sheet/:id/submit` — submit sheet for review
- `POST /api/approvals/sales-sheet/:id/review` — approve or reject (**APPROVER**)
- `POST /api/approvals/presentation/:id/submit` — submit presentation
- `POST /api/approvals/presentation/:id/review` — approve or reject (**APPROVER**)

### `QAModule`
- `POST /api/qa/sales-sheet/:id` — run QA checks (deterministic + AI)
- `POST /api/qa/presentation/:id` — run QA checks on presentation

QA checks include: missing headline/CTA, short copy, too many benefits, invalid QR URL, missing logo, slide count, balance, CTA presence.

Returns: `{ score: 0–100, passed: boolean, checks: QACheck[], aiFindings: string[] }`

### `QueueModule`
Global. Provides:
- `generation` queue — AI generation jobs
- `export` queue — PPTX/PDF rendering jobs
- Default options: 3 retries, 2s exponential backoff
- `GET /api/queues/stats` — live metrics
- `GET /api/queues/:name/failed` — failed job list
- `POST /api/queues/:name/jobs/:id/retry` — retry (**ADMIN** only)

### `StorageModule`
Wraps MinIO. Used internally by other modules.
- `upload(key, buffer, contentType, category?)` — validates then stores
- `getPresignedUrl(key, expiry?)` — time-limited download URL
- `getBuffer(key)` — download to buffer
- `delete(key)` — remove object

### `AiModule`
Exports:
- `GeminiTextProvider` — text generation
- `GeminiImageProvider` — image generation
- `PromptEngineService` — prompt loading + interpolation + execution
- `SalesCopywriterAgent` — generates copy for sales sheets
- `BrandGuardianAgent` — selects optimal logo
- `VisualDirectorAgent` — art direction for image generation
- `QAAgent` — validates generated content quality

### `HealthModule`
- `GET /api/health` — server status (public, no auth required)

## Frontend Routes (`apps/web/app/`)

| Route | Description |
|-------|-------------|
| `/dashboard` | Overview and quick stats |
| `/products` | Product catalog with filters |
| `/products/[id]` | Product detail |
| `/sales-sheets` | Sales sheet library |
| `/sales-sheets/generate` | Generate new sales sheet |
| `/sales-sheets/[id]` | Sheet detail with version history |
| `/presentations` | Presentation library |
| `/presentations/generate` | Generate new presentation |
| `/presentations/[id]` | Presentation detail with slide preview |
| `/brand-assets` | Logo and brand asset management |
| `/templates` | Template browser and admin |
| `/approvals` | Review queue |
| `/library` | All generated materials |
| `/jobs` | Queue job monitor |
| `/prompt-studio` | Prompt template editor |
| `/auth/signin` | Google sign-in page |
