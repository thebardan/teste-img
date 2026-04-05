# Multi AI Studio

Internal marketing AI platform for Multilaser / Multi — generates commercial sales sheets and presentations using structured product data and AI assistance.

## Products

**Sales Sheet Generator** — Creates branded, persuasive sales sheets (lâminas) from product catalog data. AI generates copy; the system deterministically composes the layout.

**Presentation Builder** — Assembles 5-slide commercial presentations (PPTX + PDF) tailored by client, channel, and focus. AI generates narrative and copy; the engine handles structure and export.

## Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query |
| Backend | NestJS, TypeScript, Prisma ORM |
| Database | PostgreSQL |
| Queue | Redis + BullMQ |
| Storage | MinIO |
| AI | Google Gemini (text + image) |
| Export | PptxGenJS (PPTX), Playwright / PDFKit (PDF) |
| Auth | NextAuth v4 (Google OAuth) |

---

## Quick Start

### Prerequisites

- Node.js ≥ 20
- pnpm ≥ 9
- Docker + Docker Compose

### 1. Infrastructure

```bash
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET, GEMINI_API_KEY
# API_SECRET: generate with: openssl rand -hex 32

docker compose -f infra/docker-compose.yml up -d
```

### 2. Install & migrate

```bash
pnpm install
pnpm db:migrate
pnpm db:seed
```

### 3. Run

```bash
pnpm dev
# API → http://localhost:4000/api
# Web → http://localhost:3000
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✓ | PostgreSQL connection string |
| `REDIS_URL` | ✓ | Redis connection string |
| `MINIO_ENDPOINT` | ✓ | MinIO host (e.g. `localhost`) |
| `MINIO_PORT` | ✓ | MinIO port (default `9000`) |
| `MINIO_ACCESS_KEY` | ✓ | MinIO access key |
| `MINIO_SECRET_KEY` | ✓ | MinIO secret key |
| `MINIO_BUCKET` | ✓ | Bucket name (default `multi-ai-studio`) |
| `GOOGLE_CLIENT_ID` | ✓ | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | ✓ | Google OAuth client secret |
| `NEXTAUTH_SECRET` | ✓ | Random secret for NextAuth (`openssl rand -hex 32`) |
| `NEXTAUTH_URL` | ✓ | Public URL of the web app (default `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | ✓ | Public URL of the API (default `http://localhost:4000/api`) |
| `API_SECRET` | prod | Shared secret between web and API for request authentication |
| `GEMINI_API_KEY` | AI features | Google Gemini API key |
| `PORT` | | API listen port (default `4000`) |
| `NODE_ENV` | | `development` / `production` / `test` |

---

## Project Structure

```
multi-ai-studio/
├── apps/
│   ├── api/                    # NestJS backend
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Domain model
│   │   │   ├── migrations/     # DB migrations
│   │   │   └── seed.ts         # Seed data
│   │   └── src/
│   │       ├── auth/           # ApiKeyGuard, RolesGuard, decorators
│   │       ├── common/         # Exception filter, logging, request-id
│   │       ├── ai/             # AI providers, agents, prompt engine
│   │       ├── products/       # Product catalog module
│   │       ├── brand-assets/   # Logo & brand governance
│   │       ├── sales-sheets/   # Sales sheet generation
│   │       ├── presentations/  # Presentation builder
│   │       ├── templates/      # Template engine
│   │       ├── exports/        # PPTX + PDF export
│   │       ├── approvals/      # Approval workflow
│   │       ├── qa/             # QA validation engine
│   │       ├── queue/          # BullMQ queues + monitoring
│   │       ├── storage/        # MinIO file storage
│   │       └── users/          # User lookup (for RBAC)
│   └── web/                    # Next.js frontend
│       ├── app/
│       │   ├── dashboard/
│       │   ├── products/
│       │   ├── sales-sheets/
│       │   ├── presentations/
│       │   ├── brand-assets/
│       │   ├── templates/
│       │   ├── approvals/
│       │   ├── library/
│       │   ├── jobs/
│       │   └── prompt-studio/
│       ├── components/
│       └── lib/                # apiFetch, auth, hooks
└── infra/
    └── docker-compose.yml      # PostgreSQL, Redis, MinIO
```

---

## Architecture

### AI Separation Principle

The AI never generates the final output directly. Responsibilities are split:

**AI generates:**
- Commercial copy (headline, subtitle, benefits, CTA)
- Narrative structure for slides
- Visual art direction
- Image assets (via Gemini image generation)

**The system composes deterministically:**
- Final layout and zone placement
- Logo selection and positioning
- QR code generation
- Grid, margins, safe areas
- PPTX/PDF export with consistent formatting

### Auth Flow

```
User → Google OAuth (NextAuth) → JWT in session
    → middleware.ts protects all /app routes
    → apiFetch passes X-Api-Key + X-User-Email + X-User-Role headers
    → ApiKeyGuard validates shared secret
    → RolesGuard enforces role constraints (@Roles() decorator)
```

### Queue Architecture

Two BullMQ queues with default 3 retries + exponential backoff:
- `generation` — AI generation jobs (sales sheets, presentations)
- `export` — PPTX/PDF rendering jobs

Monitor at: `GET /api/queues/stats`

---

## Key API Endpoints

### Products
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List products with filters |
| GET | `/api/products/:id` | Product detail |
| GET | `/api/products/categories` | All categories |

### Sales Sheets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/sales-sheets` | List sheets |
| POST | `/api/sales-sheets/generate` | Generate from product |
| PATCH | `/api/sales-sheets/:id/status` | Update status |

### Presentations
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/presentations/generate` | Generate from products |
| GET | `/api/presentations/:id` | Full detail with slides |

### Exports
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/exports/sales-sheet/:id/pdf` | Export sales sheet PDF |
| POST | `/api/exports/presentation/:id/pptx` | Export presentation PPTX |
| POST | `/api/exports/presentation/:id/pdf` | Export presentation PDF |
| GET | `/api/exports/artifact/:id/download` | Get download URL |

### Approvals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/approvals/pending` | Items awaiting review |
| POST | `/api/approvals/sales-sheet/:id/submit` | Submit for review |
| POST | `/api/approvals/sales-sheet/:id/review` | Approve or reject |

### QA
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/qa/sales-sheet/:id` | Run QA checks on sheet |
| POST | `/api/qa/presentation/:id` | Run QA checks on presentation |

### Queues
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/queues/stats` | Live queue metrics |
| GET | `/api/queues/:name/failed` | List failed jobs |
| POST | `/api/queues/:name/jobs/:id/retry` | Retry a failed job (ADMIN only) |

---

## User Roles

| Role | Capabilities |
|------|-------------|
| `VIEWER` | Read-only access to all content |
| `EDITOR` | Create, generate, and edit sheets/presentations |
| `APPROVER` | Review and approve/reject submissions |
| `ADMIN` | Full access + queue management + user management |

---

## AI Providers

Providers are abstracted behind interfaces, making them swappable:

- **`GeminiTextProvider`** — text generation (copy, narratives)
- **`GeminiImageProvider`** — image generation (visual assets)
- **`PromptEngineService`** — loads and renders versioned prompt templates from `src/ai/prompt-engine/prompts/`

To switch providers:
1. Implement `TextGenerationProvider` or `ImageGenerationProvider` interface
2. Update the relevant module to inject the new provider
3. No changes needed in agents or orchestrators

---

## Prompt Templates

Prompt configs live in `apps/api/src/ai/prompt-engine/prompts/`:

| File | Purpose |
|------|---------|
| `sales-headline.prompt` | Headlines for sales sheets |
| `benefits-generator.prompt` | Benefit bullet points |
| `sales-sheet-copy.prompt` | Full sales sheet copy |
| `visual-direction.prompt` | Art direction instructions |
| `slide-structure.prompt` | 5-slide narrative structure |
| `slide-copy.prompt` | Per-slide copy generation |
| `qa-check.prompt` | QA validation via LLM |

Prompts support variable interpolation via `{{ variableName }}` syntax.

---

## Template Engine

Templates define zones (areas) for each region of a sales sheet or slide:

```json
{
  "headline": { "x": 40, "y": 60, "w": 760, "h": 80 },
  "image":    { "x": 0,  "y": 0,  "w": 450, "h": 600 },
  "cta":      { "x": 480, "y": 480, "w": 280, "h": 60 },
  "qr":       { "x": 720, "y": 510, "w": 80,  "h": 80 }
}
```

The compositor reads zones from the template's `zonesConfig` JSON. Adding a new template only requires a database record — no code changes.

---

## Running Tests

```bash
# All tests
pnpm test

# API only (with coverage)
pnpm --filter api test -- --coverage

# Watch mode
pnpm --filter api test -- --watch
```

Test files follow the `*.spec.ts` convention co-located with the source files they test.

---

## Troubleshooting

**`System user not found — run seed first`**
Run `pnpm db:seed` to create the default admin user and seed data.

**MinIO connection errors on startup**
Ensure `docker compose -f infra/docker-compose.yml up -d` is running and healthy. Storage errors are non-fatal in development — the API will start but uploads will fail.

**`API_SECRET not configured` (production)**
Set `API_SECRET` in your environment. Generate with: `openssl rand -hex 32`

**Google OAuth redirect mismatch**
Ensure `NEXTAUTH_URL` matches the authorized redirect URI in your Google Cloud Console OAuth credentials.

**Queue jobs stuck in `delayed` state**
Check Redis connectivity. Run `GET /api/queues/stats` to inspect queue health.

**Gemini API errors**
Verify `GEMINI_API_KEY` is set. The system degrades gracefully — AI fields will be empty but generation jobs will complete with fallback copy.

---

## Development Scripts

```bash
pnpm dev              # Start API + Web in watch mode
pnpm build            # Build all packages
pnpm test             # Run all test suites
pnpm lint             # Lint all packages
pnpm db:migrate       # Run Prisma migrations
pnpm db:seed          # Seed demo data
pnpm db:studio        # Open Prisma Studio (database GUI)
```
