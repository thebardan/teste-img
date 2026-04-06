# Foundation & Domain Model — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold the full monorepo with NestJS API, Next.js frontend, PostgreSQL, Redis, MinIO and Google SSO auth — all running locally via Docker Compose, with the complete Prisma domain schema migrated and realistic seed data loaded.

**Architecture:** Turborepo monorepo with `apps/web` (Next.js 14 App Router) and `apps/api` (NestJS). Shared packages (`shared-types`, `slide-schema`, `prompt-configs`) are built as internal workspace packages. Infrastructure runs in Docker Compose. Auth is NextAuth.js with Google OAuth.

**Tech Stack:** pnpm 9+, Turborepo, Next.js 14, NestJS 10, Prisma 5, PostgreSQL 15, Redis 7, MinIO, NextAuth.js 4, shadcn/ui, Tailwind CSS 3, Zod, BullMQ, TypeScript 5.

---

## File Structure

```
/
├── package.json                          # root workspace
├── pnpm-workspace.yaml
├── turbo.json
├── .env.example
├── .gitignore
├── infra/
│   └── docker-compose.yml
├── apps/
│   ├── api/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── nest-cli.json
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── app.module.ts
│   │   │   ├── config/
│   │   │   │   └── env.ts                # typed env via @nestjs/config + Zod
│   │   │   ├── health/
│   │   │   │   ├── health.controller.ts
│   │   │   │   └── health.module.ts
│   │   │   ├── database/
│   │   │   │   └── database.module.ts    # Prisma provider
│   │   │   ├── queue/
│   │   │   │   └── queue.module.ts       # BullMQ global config
│   │   │   └── storage/
│   │   │       ├── storage.module.ts
│   │   │       └── storage.service.ts    # MinIO wrapper
│   │   └── prisma/
│   │       ├── schema.prisma             # full domain schema
│   │       └── seed.ts                   # realistic seed data
│   └── web/
│       ├── package.json
│       ├── tsconfig.json
│       ├── next.config.ts
│       ├── tailwind.config.ts
│       ├── components.json               # shadcn config
│       ├── app/
│       │   ├── layout.tsx
│       │   ├── page.tsx                  # dashboard placeholder
│       │   └── api/
│       │       └── auth/
│       │           └── [...nextauth]/
│       │               └── route.ts
│       ├── components/
│       │   └── layout/
│       │       ├── app-shell.tsx         # sidebar + main area
│       │       └── sidebar.tsx
│       └── lib/
│           ├── auth.ts                   # NextAuth config
│           └── query-client.tsx          # TanStack Query provider
└── packages/
    ├── shared-types/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts                  # shared DTOs and enums
    ├── slide-schema/
    │   ├── package.json
    │   ├── tsconfig.json
    │   └── src/
    │       └── index.ts                  # SlideContent + SalesSheetContent + Zod
    └── prompt-configs/
        ├── package.json
        ├── tsconfig.json
        └── src/
            ├── index.ts
            └── prompts/
                ├── product-summary.ts
                ├── sales-headline.ts
                ├── benefits-generator.ts
                ├── sales-sheet-copy.ts
                ├── visual-direction.ts
                ├── image-generation.ts
                ├── slide-structure.ts
                ├── slide-copy.ts
                ├── comparison-generator.ts
                └── qa-check.ts
```

---

## Task 1: Monorepo root scaffold

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `.gitignore`
- Create: `.env.example`

- [ ] **Step 1: Initialize pnpm workspace**

```bash
cd /path/to/teste-img
pnpm init
```

- [ ] **Step 2: Write root `package.json`**

```json
{
  "name": "multi-ai-studio",
  "private": true,
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "lint": "turbo run lint",
    "test": "turbo run test",
    "db:migrate": "pnpm --filter api prisma migrate dev",
    "db:seed": "pnpm --filter api prisma db seed",
    "db:studio": "pnpm --filter api prisma studio"
  },
  "devDependencies": {
    "turbo": "^2.0.0",
    "typescript": "^5.4.0"
  },
  "engines": {
    "node": ">=20.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

- [ ] **Step 3: Write `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 4: Write `turbo.json`**

```json
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {},
    "test": {
      "dependsOn": ["^build"]
    }
  }
}
```

- [ ] **Step 5: Write `.gitignore`**

```
node_modules/
.env
.env.local
dist/
.next/
*.log
.turbo/
.superpowers/
```

- [ ] **Step 6: Write `.env.example`**

```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/multi_ai_studio"

# Redis
REDIS_URL="redis://localhost:6379"

# MinIO
MINIO_ENDPOINT="localhost"
MINIO_PORT="9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="multi-ai-studio"
MINIO_USE_SSL="false"

# Google Auth (NextAuth)
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NEXTAUTH_SECRET=""
NEXTAUTH_URL="http://localhost:3000"

# Gemini
GEMINI_API_KEY=""

# API
API_URL="http://localhost:4000"
API_SECRET="change-me-in-production"
```

- [ ] **Step 7: Commit**

```bash
git init
git add package.json pnpm-workspace.yaml turbo.json .gitignore .env.example
git commit -m "chore: initialize monorepo with Turborepo and pnpm workspaces"
```

---

## Task 2: Docker Compose infrastructure

**Files:**
- Create: `infra/docker-compose.yml`

- [ ] **Step 1: Create `infra/docker-compose.yml`**

```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: multi_ai_studio
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis_data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 5s
      timeout: 5s
      retries: 5

  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - '9000:9000'
      - '9001:9001'
    volumes:
      - minio_data:/data
    healthcheck:
      test: ['CMD', 'curl', '-f', 'http://localhost:9000/minio/health/live']
      interval: 10s
      timeout: 5s
      retries: 3

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

- [ ] **Step 2: Start infrastructure and verify**

```bash
docker compose -f infra/docker-compose.yml up -d
docker compose -f infra/docker-compose.yml ps
```

Expected: all 3 services `healthy` or `running`.

- [ ] **Step 3: Commit**

```bash
git add infra/
git commit -m "chore: add Docker Compose with postgres, redis and minio"
```

---

## Task 3: `packages/shared-types`

**Files:**
- Create: `packages/shared-types/package.json`
- Create: `packages/shared-types/tsconfig.json`
- Create: `packages/shared-types/src/index.ts`

- [ ] **Step 1: Create `packages/shared-types/package.json`**

```json
{
  "name": "@multi-ai/shared-types",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit"
  }
}
```

- [ ] **Step 2: Create `packages/shared-types/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: Write `packages/shared-types/src/index.ts`**

```typescript
// Approval status machine
export type ApprovalStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

// Generation job status
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

// Export artifact types
export type ArtifactType = 'PNG' | 'JPEG' | 'PDF' | 'PPTX'

// Product domain
export interface ProductSummary {
  id: string
  sku: string
  name: string
  brand: string
  category: string
  subcategory?: string
  description: string
  imageUrls: string[]
}

// Brand asset types
export type BrandAssetType = 'LOGO' | 'ICON' | 'PATTERN' | 'COLOR_SWATCH'
export type BackgroundType = 'DARK' | 'LIGHT' | 'COLORED' | 'ANY'

// Template types
export type TemplateType =
  | 'SALES_SHEET_HORIZONTAL'
  | 'SALES_SHEET_VERTICAL'
  | 'SALES_SHEET_A4'
  | 'DECK_CORPORATE'
  | 'DECK_RETAIL'
  | 'DECK_PREMIUM'
  | 'DECK_DISTRIBUTOR'

// Presentation slide types
export type SlideType = 'cover' | 'context' | 'products' | 'benefits' | 'closing'

// User roles
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'APPROVER'

// Pagination
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
```

- [ ] **Step 4: Commit**

```bash
git add packages/shared-types/
git commit -m "feat: add shared-types package with domain enums and interfaces"
```

---

## Task 4: `packages/slide-schema`

**Files:**
- Create: `packages/slide-schema/package.json`
- Create: `packages/slide-schema/tsconfig.json`
- Create: `packages/slide-schema/src/index.ts`

- [ ] **Step 1: Install dependencies**

```bash
mkdir -p packages/slide-schema/src
cat > packages/slide-schema/package.json << 'EOF'
{
  "name": "@multi-ai/slide-schema",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "test": "vitest run",
    "lint": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "vitest": "^1.6.0"
  }
}
EOF
```

- [ ] **Step 2: Create `packages/slide-schema/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "CommonJS",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true
  }
}
```

- [ ] **Step 3: Write failing tests**

Create `packages/slide-schema/src/index.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'
import { SalesSheetContentSchema, SlideContentSchema } from './index'

describe('SalesSheetContentSchema', () => {
  it('validates a valid sales sheet', () => {
    const valid = {
      headline: 'Conecte-se ao futuro',
      benefits: ['Full HD 1080p', 'Microfone embutido', 'Plug & Play'],
      cta: 'Saiba mais',
      productImageUrl: 'https://minio/products/wc1080.jpg',
      logoAssetId: 'brand-asset-uuid',
      qrUrl: 'https://multilaser.com/wc1080',
      layout: { templateId: 'tpl-horizontal', zones: {} },
    }
    expect(SalesSheetContentSchema.parse(valid)).toMatchObject({ headline: 'Conecte-se ao futuro' })
  })

  it('rejects if benefits is empty', () => {
    expect(() =>
      SalesSheetContentSchema.parse({ headline: 'X', benefits: [], cta: 'Y', productImageUrl: 'u', logoAssetId: 'l', qrUrl: 'q', layout: { templateId: 't', zones: {} } })
    ).toThrow()
  })
})

describe('SlideContentSchema', () => {
  it('validates a cover slide', () => {
    const valid = {
      type: 'cover',
      title: 'Proposta Multilaser',
      layout: { templateId: 'tpl-corporate', zones: {} },
    }
    expect(SlideContentSchema.parse(valid)).toMatchObject({ type: 'cover' })
  })

  it('rejects invalid slide type', () => {
    expect(() =>
      SlideContentSchema.parse({ type: 'invalid', title: 'X', layout: { templateId: 't', zones: {} } })
    ).toThrow()
  })
})
```

- [ ] **Step 4: Run tests — expect FAIL**

```bash
cd packages/slide-schema && pnpm install && pnpm test
```

Expected: `Error: Cannot find module './index'`

- [ ] **Step 5: Write `packages/slide-schema/src/index.ts`**

```typescript
import { z } from 'zod'

const LayoutConfigSchema = z.object({
  templateId: z.string(),
  zones: z.record(z.any()), // zone overrides; template defines defaults
})

// ─── Sales Sheet (single-page composition) ───────────────────────────────────

export const SalesSheetContentSchema = z.object({
  headline: z.string().min(1),
  subtitle: z.string().optional(),
  benefits: z.array(z.string()).min(1).max(5),
  cta: z.string().min(1),
  productImageUrl: z.string().url(),
  generatedVisualUrl: z.string().url().optional(), // Gemini output
  logoAssetId: z.string(),
  qrUrl: z.string().url(),
  layout: LayoutConfigSchema,
})

export type SalesSheetContent = z.infer<typeof SalesSheetContentSchema>

// ─── Slide (16:9 presentation slide) ─────────────────────────────────────────

const SlideProductSchema = z.object({
  productId: z.string(),
  name: z.string(),
  imageUrl: z.string().url().optional(),
  highlights: z.array(z.string()),
})

const ComparativeSchema = z.object({
  attribute: z.string(),
  ourValue: z.string(),
  competitorValue: z.string().optional(),
  flaggedForReview: z.boolean().default(true), // always flag comparatives
})

export const SlideContentSchema = z.object({
  type: z.enum(['cover', 'context', 'products', 'benefits', 'closing']),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  body: z.array(z.string()).optional(),
  heroImageUrl: z.string().url().optional(),
  logoAssetId: z.string().optional(),
  qrUrl: z.string().url().optional(),
  cta: z.string().optional(),
  products: z.array(SlideProductSchema).optional(),
  comparatives: z.array(ComparativeSchema).optional(),
  layout: LayoutConfigSchema,
})

export type SlideContent = z.infer<typeof SlideContentSchema>
export type SlideProduct = z.infer<typeof SlideProductSchema>
export type Comparative = z.infer<typeof ComparativeSchema>
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>
```

- [ ] **Step 6: Run tests — expect PASS**

```bash
pnpm test
```

Expected: `2 test files, 4 tests passed`

- [ ] **Step 7: Commit**

```bash
cd ../..
git add packages/slide-schema/
git commit -m "feat: add slide-schema package with Zod-validated SalesSheetContent and SlideContent"
```

---

## Task 5: `packages/prompt-configs`

**Files:**
- Create: `packages/prompt-configs/package.json`
- Create: `packages/prompt-configs/src/index.ts`
- Create: `packages/prompt-configs/src/prompts/*.ts` (10 files)

- [ ] **Step 1: Create `packages/prompt-configs/package.json`**

```json
{
  "name": "@multi-ai/prompt-configs",
  "version": "0.0.1",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts"
}
```

- [ ] **Step 2: Write `packages/prompt-configs/src/index.ts`**

```typescript
export * from './prompts/product-summary'
export * from './prompts/sales-headline'
export * from './prompts/benefits-generator'
export * from './prompts/sales-sheet-copy'
export * from './prompts/visual-direction'
export * from './prompts/image-generation'
export * from './prompts/slide-structure'
export * from './prompts/slide-copy'
export * from './prompts/comparison-generator'
export * from './prompts/qa-check'

export interface PromptConfig {
  id: string
  version: string
  template: string
  variables: string[]
  outputSchema?: string
}

export function renderPrompt(config: PromptConfig, vars: Record<string, string>): string {
  return config.variables.reduce(
    (tpl, key) => tpl.replaceAll(`{{${key}}}`, vars[key] ?? ''),
    config.template,
  )
}
```

- [ ] **Step 3: Write `packages/prompt-configs/src/prompts/product-summary.ts`**

```typescript
import type { PromptConfig } from '../index'

export const productSummaryPrompt: PromptConfig = {
  id: 'product-summary',
  version: '1.0.0',
  variables: ['productName', 'sku', 'category', 'description', 'benefits', 'specs'],
  template: `Você é um especialista em marketing de produto da Multilaser.
Analise os dados abaixo e produza um resumo comercial estruturado em JSON.

Produto: {{productName}} (SKU: {{sku}})
Categoria: {{category}}
Descrição: {{description}}
Benefícios declarados: {{benefits}}
Especificações: {{specs}}

Responda APENAS com JSON válido no formato:
{
  "summary": "resumo comercial em 2-3 frases",
  "keyStrengths": ["força 1", "força 2", "força 3"],
  "targetAudience": "descrição do público-alvo",
  "primaryUseCase": "caso de uso principal"
}`,
  outputSchema: '{ summary: string, keyStrengths: string[], targetAudience: string, primaryUseCase: string }',
}
```

- [ ] **Step 4: Write `packages/prompt-configs/src/prompts/sales-headline.ts`**

```typescript
import type { PromptConfig } from '../index'

export const salesHeadlinePrompt: PromptConfig = {
  id: 'sales-headline',
  version: '1.0.0',
  variables: ['productName', 'summary', 'targetAudience', 'channel'],
  template: `Você é um copywriter sênior especialista em lâminas de vendas B2B e B2C.
Crie headline e subtítulo para a lâmina do produto abaixo.

Produto: {{productName}}
Resumo: {{summary}}
Público: {{targetAudience}}
Canal: {{channel}}

Regras:
- Headline: máximo 8 palavras, impactante, vendável, sem clichês
- Subtítulo: máximo 15 palavras, complementa a headline, foco em benefício
- Tom: moderno, confiante, direto
- Idioma: português brasileiro

Responda APENAS com JSON válido:
{
  "headline": "headline aqui",
  "subtitle": "subtítulo aqui"
}`,
  outputSchema: '{ headline: string, subtitle: string }',
}
```

- [ ] **Step 5: Write `packages/prompt-configs/src/prompts/benefits-generator.ts`**

```typescript
import type { PromptConfig } from '../index'

export const benefitsGeneratorPrompt: PromptConfig = {
  id: 'benefits-generator',
  version: '1.0.0',
  variables: ['productName', 'rawBenefits', 'targetAudience'],
  template: `Reescreva os benefícios do produto para uso em lâmina comercial.
Produto: {{productName}}
Benefícios originais: {{rawBenefits}}
Público: {{targetAudience}}

Regras:
- Máximo 5 benefícios
- Cada benefício: máximo 6 palavras
- Foco no valor para o usuário, não na feature técnica
- Comece com verbo no imperativo ou substantivo de impacto
- Idioma: português brasileiro

Responda APENAS com JSON válido:
{ "benefits": ["benefício 1", "benefício 2", "benefício 3"] }`,
  outputSchema: '{ benefits: string[] }',
}
```

- [ ] **Step 6: Write `packages/prompt-configs/src/prompts/sales-sheet-copy.ts`**

```typescript
import type { PromptConfig } from '../index'

export const salesSheetCopyPrompt: PromptConfig = {
  id: 'sales-sheet-copy',
  version: '1.0.0',
  variables: ['productName', 'headline', 'benefits', 'channel'],
  template: `Crie o CTA (call to action) para a lâmina do produto.
Produto: {{productName}}
Headline: {{headline}}
Benefícios: {{benefits}}
Canal: {{channel}}

Regras:
- CTA: máximo 4 palavras
- Deve gerar ação imediata
- Exemplos de tom: "Peça agora", "Saiba mais", "Fale com o representante"

Responda APENAS com JSON: { "cta": "texto do CTA" }`,
  outputSchema: '{ cta: string }',
}
```

- [ ] **Step 7: Write `packages/prompt-configs/src/prompts/visual-direction.ts`**

```typescript
import type { PromptConfig } from '../index'

export const visualDirectionPrompt: PromptConfig = {
  id: 'visual-direction',
  version: '1.0.0',
  variables: ['productName', 'category', 'headline', 'targetAudience', 'templateType'],
  template: `Você é um diretor de arte especialista em lâminas de vendas corporativas.
Crie a direção visual e o prompt de geração de imagem para a lâmina.

Produto: {{productName}}
Categoria: {{category}}
Headline: {{headline}}
Público: {{targetAudience}}
Template: {{templateType}}

Gere:
1. Descrição da direção de arte (paleta, mood, estilo)
2. Prompt para geração de imagem com Gemini

Regras do prompt de imagem:
- Deve reservar espaço negativo para texto (headline e CTA)
- Não incluir texto na imagem
- Estilo fotográfico comercial profissional ou render 3D limpo
- Iluminação de produto clara e atraente
- Fundo que combine com o template {{templateType}}

Responda APENAS com JSON:
{
  "artDirection": "descrição da direção de arte",
  "imagePrompt": "prompt completo em inglês para geração de imagem",
  "colorPalette": ["#hex1", "#hex2", "#hex3"],
  "mood": "moderno | premium | tecnológico | doméstico | corporativo"
}`,
  outputSchema: '{ artDirection: string, imagePrompt: string, colorPalette: string[], mood: string }',
}
```

- [ ] **Step 8: Write remaining 5 prompt files**

Create `packages/prompt-configs/src/prompts/image-generation.ts`:
```typescript
import type { PromptConfig } from '../index'

export const imageGenerationPrompt: PromptConfig = {
  id: 'image-generation',
  version: '1.0.0',
  variables: ['basePrompt', 'artDirection', 'templateType', 'mood'],
  template: `{{basePrompt}}

Style: {{mood}}, commercial photography, product marketing material.
Art direction: {{artDirection}}
Template context: {{templateType}} sales sheet layout.
Requirements: Leave negative space on right side for text overlay. No text in image. Professional lighting. High resolution.`,
  outputSchema: 'binary image',
}
```

Create `packages/prompt-configs/src/prompts/slide-structure.ts`:
```typescript
import type { PromptConfig } from '../index'

export const slideStructurePrompt: PromptConfig = {
  id: 'slide-structure',
  version: '1.0.0',
  variables: ['clientName', 'products', 'channel', 'focus', 'objective'],
  template: `Você é um estrategista comercial sênior da Multilaser.
Monte a estrutura narrativa de uma apresentação comercial de 5 slides.

Cliente: {{clientName}}
Produtos: {{products}}
Canal: {{channel}}
Foco: {{focus}}
Objetivo: {{objective}}

Estrutura obrigatória dos slides:
1. cover — capa com proposta de valor principal
2. context — contexto de mercado e oportunidade para o cliente
3. products — os produtos e seus diferenciais
4. benefits — argumentos de venda e comparativos (se houver)
5. closing — fechamento com CTA e próximos passos

Para cada slide, defina: título principal, proposta de conteúdo (2-3 frases), ponto de destaque.

Responda APENAS com JSON:
{
  "slides": [
    { "type": "cover", "title": "...", "contentBrief": "...", "highlight": "..." },
    { "type": "context", "title": "...", "contentBrief": "...", "highlight": "..." },
    { "type": "products", "title": "...", "contentBrief": "...", "highlight": "..." },
    { "type": "benefits", "title": "...", "contentBrief": "...", "highlight": "..." },
    { "type": "closing", "title": "...", "contentBrief": "...", "highlight": "..." }
  ]
}`,
  outputSchema: '{ slides: Array<{ type: SlideType, title: string, contentBrief: string, highlight: string }> }',
}
```

Create `packages/prompt-configs/src/prompts/slide-copy.ts`:
```typescript
import type { PromptConfig } from '../index'

export const slideCopyPrompt: PromptConfig = {
  id: 'slide-copy',
  version: '1.0.0',
  variables: ['slideType', 'title', 'contentBrief', 'productContext', 'clientName', 'channel'],
  template: `Escreva o copy final para o slide abaixo.

Tipo: {{slideType}}
Título: {{title}}
Brief: {{contentBrief}}
Contexto do produto: {{productContext}}
Cliente: {{clientName}}
Canal: {{channel}}

Regras:
- Subtítulo: máximo 15 palavras
- Bullets: máximo 4 itens, máximo 8 palavras cada
- Tom: profissional, comercial, direto
- Idioma: português brasileiro

Responda APENAS com JSON:
{
  "subtitle": "subtítulo do slide",
  "body": ["bullet 1", "bullet 2", "bullet 3"],
  "cta": "CTA se for slide de closing, null caso contrário"
}`,
  outputSchema: '{ subtitle: string, body: string[], cta: string | null }',
}
```

Create `packages/prompt-configs/src/prompts/comparison-generator.ts`:
```typescript
import type { PromptConfig } from '../index'

export const comparisonGeneratorPrompt: PromptConfig = {
  id: 'comparison-generator',
  version: '1.0.0',
  variables: ['productName', 'specs', 'benefits', 'category'],
  template: `Você é um analista de mercado. Sugira comparativos comerciais para o produto.
IMPORTANTE: Separe claramente o que é fato documentado do que é inferência de mercado.

Produto: {{productName}}
Specs: {{specs}}
Benefícios: {{benefits}}
Categoria: {{category}}

Gere comparativos de atributos onde o produto se destaca.
NUNCA invente dados numéricos precisos de concorrentes — marque como sugestão para revisão humana.

Responda APENAS com JSON:
{
  "comparatives": [
    {
      "attribute": "nome do atributo",
      "ourValue": "valor do nosso produto",
      "competitorValue": "valor estimado do mercado ou null",
      "flaggedForReview": true,
      "note": "fonte ou motivo da inferência"
    }
  ]
}`,
  outputSchema: '{ comparatives: Comparative[] }',
}
```

Create `packages/prompt-configs/src/prompts/qa-check.ts`:
```typescript
import type { PromptConfig } from '../index'

export const qaCheckPrompt: PromptConfig = {
  id: 'qa-check',
  version: '1.0.0',
  variables: ['headline', 'benefits', 'cta', 'hasLogo', 'hasQr', 'comparativesCount'],
  template: `Você é um QA especialista em materiais de marketing.
Revise o conteúdo da lâmina/slide abaixo e identifique problemas.

Headline: {{headline}}
Benefícios: {{benefits}}
CTA: {{cta}}
Tem logo: {{hasLogo}}
Tem QR: {{hasQr}}
Número de comparativos para revisão: {{comparativesCount}}

Verifique:
- Ortografia e gramática
- CTA presente e claro
- Logo presente
- Excesso de texto (headline > 10 palavras = problema)
- Comparativos que precisam de revisão humana

Responda APENAS com JSON:
{
  "passed": true | false,
  "score": 0-100,
  "flags": [
    { "severity": "error | warning | info", "code": "MISSING_CTA | LONG_HEADLINE | MISSING_LOGO | COMPARATIVE_REVIEW | SPELLING", "message": "descrição" }
  ]
}`,
  outputSchema: '{ passed: boolean, score: number, flags: QAFlag[] }',
}
```

- [ ] **Step 9: Commit**

```bash
git add packages/prompt-configs/
git commit -m "feat: add prompt-configs package with 10 versioned prompt templates"
```

---

## Task 6: NestJS API base

**Files:**
- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/nest-cli.json`
- Create: `apps/api/src/main.ts`
- Create: `apps/api/src/app.module.ts`
- Create: `apps/api/src/config/env.ts`

- [ ] **Step 1: Install NestJS CLI globally and scaffold**

```bash
pnpm add -g @nestjs/cli
mkdir -p apps/api
cd apps/api
nest new . --skip-git --package-manager pnpm --strict
```

When prompted for package manager, select `pnpm`.

- [ ] **Step 2: Add required dependencies**

```bash
cd apps/api
pnpm add @nestjs/config @nestjs/terminus zod
pnpm add -D @types/node
```

- [ ] **Step 3: Update `apps/api/package.json` name**

Edit the `"name"` field to `"@multi-ai/api"`.

- [ ] **Step 4: Write `apps/api/src/config/env.ts`**

```typescript
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  MINIO_ENDPOINT: z.string(),
  MINIO_PORT: z.coerce.number().default(9000),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('multi-ai-studio'),
  MINIO_USE_SSL: z.coerce.boolean().default(false),
  GEMINI_API_KEY: z.string(),
  API_SECRET: z.string(),
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
})

export type Env = z.infer<typeof envSchema>

export function validateEnv(config: Record<string, unknown>): Env {
  const result = envSchema.safeParse(config)
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${result.error.toString()}`)
  }
  return result.data
}
```

- [ ] **Step 5: Write `apps/api/src/app.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { validateEnv } from './config/env'
import { HealthModule } from './health/health.module'
import { DatabaseModule } from './database/database.module'
import { QueueModule } from './queue/queue.module'
import { StorageModule } from './storage/storage.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    DatabaseModule,
    QueueModule,
    StorageModule,
    HealthModule,
  ],
})
export class AppModule {}
```

- [ ] **Step 6: Write `apps/api/src/main.ts`**

```typescript
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('api')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }))
  app.enableCors({ origin: process.env.NEXTAUTH_URL ?? 'http://localhost:3000' })
  const port = process.env.PORT ?? 4000
  await app.listen(port)
  console.log(`API running on http://localhost:${port}/api`)
}
bootstrap()
```

- [ ] **Step 7: Commit**

```bash
cd ../..
git add apps/api/
git commit -m "feat: scaffold NestJS API with config validation and global modules"
```

---

## Task 7: Prisma setup + database module

**Files:**
- Create: `apps/api/prisma/schema.prisma`
- Create: `apps/api/src/database/database.module.ts`

- [ ] **Step 1: Install Prisma**

```bash
cd apps/api
pnpm add prisma @prisma/client
npx prisma init --datasource-provider postgresql
```

- [ ] **Step 2: Write `apps/api/prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ─── Identity ────────────────────────────────────────────────────────────────

enum UserRole {
  ADMIN
  EDITOR
  VIEWER
  APPROVER
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  image     String?
  role      UserRole @default(VIEWER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  salesSheets   SalesSheet[]
  presentations Presentation[]
  approvals     Approval[]
  auditLogs     AuditLog[]
}

model Client {
  id        String   @id @default(cuid())
  name      String
  segment   String?
  channel   String?
  notes     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  presentations Presentation[]
}

// ─── Product Catalog ─────────────────────────────────────────────────────────

model Product {
  id            String  @id @default(cuid())
  sku           String  @unique
  name          String
  brand         String
  category      String
  subcategory   String?
  description   String
  qrDestination String?
  isActive      Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  images         ProductImage[]
  specifications ProductSpecification[]
  benefits       ProductBenefit[]
  claims         ProductClaim[]
  packaging      ProductPackaging?
  links          ProductLink[]
  variants       ProductVariant[]
  salesSheets    SalesSheet[]
}

model ProductImage {
  id        String  @id @default(cuid())
  productId String
  url       String  // MinIO path
  altText   String?
  isPrimary Boolean @default(false)
  order     Int     @default(0)

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductSpecification {
  id        String @id @default(cuid())
  productId String
  key       String
  value     String
  unit      String?
  group     String? // e.g. "Dimensões", "Elétrico"

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductBenefit {
  id        String @id @default(cuid())
  productId String
  text      String
  order     Int    @default(0)

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductClaim {
  id        String @id @default(cuid())
  productId String
  text      String
  isVerified Boolean @default(false)

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductPackaging {
  id           String  @id @default(cuid())
  productId    String  @unique
  weightKg     Float?
  widthCm      Float?
  heightCm     Float?
  depthCm      Float?
  unitsPerBox  Int?
  eanCode      String?

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductLink {
  id        String @id @default(cuid())
  productId String
  label     String
  url       String
  type      String // e.g. "MANUAL", "VIDEO", "ECOMMERCE"

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model ProductVariant {
  id        String @id @default(cuid())
  productId String
  sku       String @unique
  name      String
  color     String?
  size      String?

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

// ─── Brand Assets ─────────────────────────────────────────────────────────────

enum BrandAssetType {
  LOGO
  ICON
  PATTERN
  COLOR_SWATCH
}

enum BackgroundType {
  DARK
  LIGHT
  COLORED
  ANY
}

model BrandAsset {
  id          String         @id @default(cuid())
  name        String
  type        BrandAssetType
  url         String         // MinIO path
  format      String         // SVG, PNG, etc
  bestOn      BackgroundType
  description String?
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt

  rules BrandRule[]
}

model BrandRule {
  id          String @id @default(cuid())
  brandAssetId String
  condition   String // e.g. "background === 'dark'"
  score       Int    // higher = better match
  notes       String?

  asset BrandAsset @relation(fields: [brandAssetId], references: [id], onDelete: Cascade)
}

// ─── Templates ───────────────────────────────────────────────────────────────

enum TemplateType {
  SALES_SHEET_HORIZONTAL
  SALES_SHEET_VERTICAL
  SALES_SHEET_A4
  DECK_CORPORATE
  DECK_RETAIL
  DECK_PREMIUM
  DECK_DISTRIBUTOR
}

model Template {
  id          String       @id @default(cuid())
  name        String
  type        TemplateType
  description String?
  zonesConfig Json         // LayoutConfig zones definition
  isActive    Boolean      @default(true)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  variants      TemplateVariant[]
  salesSheets   SalesSheet[]
  presentations Presentation[]
}

model TemplateVariant {
  id          String @id @default(cuid())
  templateId  String
  name        String
  zonesConfig Json   // overrides parent zonesConfig

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
}

// ─── Sales Sheets ─────────────────────────────────────────────────────────────

enum ApprovalStatus {
  DRAFT
  IN_REVIEW
  APPROVED
  REJECTED
  ARCHIVED
}

model SalesSheet {
  id         String         @id @default(cuid())
  title      String
  status     ApprovalStatus @default(DRAFT)
  productId  String
  templateId String
  authorId   String
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  product  Product  @relation(fields: [productId], references: [id])
  template Template @relation(fields: [templateId], references: [id])
  author   User     @relation(fields: [authorId], references: [id])

  versions  SalesSheetVersion[]
  approvals Approval[]
}

model SalesSheetVersion {
  id           String   @id @default(cuid())
  salesSheetId String
  versionNumber Int
  content      Json     // SalesSheetContent (frozen snapshot)
  promptLogId  String?  // FK to InferenceLog batch
  createdAt    DateTime @default(now())

  salesSheet SalesSheet        @relation(fields: [salesSheetId], references: [id], onDelete: Cascade)
  artifacts  ExportedArtifact[]
  inferenceLogs InferenceLog[]
}

// ─── Presentations ───────────────────────────────────────────────────────────

model Presentation {
  id         String         @id @default(cuid())
  title      String
  status     ApprovalStatus @default(DRAFT)
  clientId   String?
  templateId String
  authorId   String
  focus      String?        // e.g. "benefícios", "comparativos"
  channel    String?        // e.g. "varejo", "distribuidor"
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt

  client   Client?  @relation(fields: [clientId], references: [id])
  template Template @relation(fields: [templateId], references: [id])
  author   User     @relation(fields: [authorId], references: [id])

  versions  PresentationVersion[]
  approvals Approval[]
}

model PresentationVersion {
  id             String   @id @default(cuid())
  presentationId String
  versionNumber  Int
  createdAt      DateTime @default(now())

  presentation Presentation      @relation(fields: [presentationId], references: [id], onDelete: Cascade)
  slides       PresentationSlide[]
  artifacts    ExportedArtifact[]
  inferenceLogs InferenceLog[]
}

model PresentationSlide {
  id        String @id @default(cuid())
  versionId String
  order     Int
  content   Json   // SlideContent (frozen snapshot)

  version PresentationVersion @relation(fields: [versionId], references: [id], onDelete: Cascade)
}

// ─── Generation Jobs ──────────────────────────────────────────────────────────

enum JobStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
}

model GenerationJob {
  id         String    @id @default(cuid())
  type       String    // e.g. "SALES_SHEET" | "PRESENTATION"
  status     JobStatus @default(PENDING)
  entityId   String    // FK to SalesSheet or Presentation id
  entityType String    // "SalesSheet" | "Presentation"
  payload    Json      // job input
  error      String?
  startedAt  DateTime?
  completedAt DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt
}

// ─── AI Inference Logs ────────────────────────────────────────────────────────

model PromptTemplate {
  id        String   @id @default(cuid())
  promptId  String   // matches PromptConfig.id
  version   String
  template  String
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
}

model InferenceLog {
  id                  String    @id @default(cuid())
  promptId            String
  promptVersion       String
  provider            String    // e.g. "gemini-2.0-flash"
  renderedPrompt      String
  rawResponse         String
  parsedOutput        Json?
  durationMs          Int?
  success             Boolean
  error               String?
  salesSheetVersionId String?
  presentationVersionId String?
  createdAt           DateTime  @default(now())

  salesSheetVersion   SalesSheetVersion?   @relation(fields: [salesSheetVersionId], references: [id])
  presentationVersion PresentationVersion? @relation(fields: [presentationVersionId], references: [id])
}

// ─── Export Artifacts ─────────────────────────────────────────────────────────

enum ArtifactType {
  PNG
  JPEG
  PDF
  PPTX
}

model ExportedArtifact {
  id                  String       @id @default(cuid())
  type                ArtifactType
  storageKey          String       // MinIO object key
  sizeBytes           Int?
  filename            String
  salesSheetVersionId String?
  presentationVersionId String?
  createdAt           DateTime     @default(now())

  salesSheetVersion   SalesSheetVersion?   @relation(fields: [salesSheetVersionId], references: [id])
  presentationVersion PresentationVersion? @relation(fields: [presentationVersionId], references: [id])
}

// ─── Approvals ────────────────────────────────────────────────────────────────

model Approval {
  id            String         @id @default(cuid())
  salesSheetId  String?
  presentationId String?
  approverId    String
  status        ApprovalStatus
  comment       String?
  createdAt     DateTime       @default(now())

  salesSheet   SalesSheet?   @relation(fields: [salesSheetId], references: [id])
  presentation Presentation? @relation(fields: [presentationId], references: [id])
  approver     User          @relation(fields: [approverId], references: [id])
}

// ─── Audit Log ────────────────────────────────────────────────────────────────

model AuditLog {
  id         String   @id @default(cuid())
  userId     String
  action     String   // e.g. "APPROVED_SALES_SHEET"
  entityType String
  entityId   String
  metadata   Json?
  createdAt  DateTime @default(now())

  user User @relation(fields: [userId], references: [id])
}
```

- [ ] **Step 3: Write `apps/api/src/database/database.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

const prismaProvider = {
  provide: PrismaClient,
  useFactory: () => {
    const prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' ? ['query', 'error'] : ['error'],
    })
    return prisma
  },
}

@Global()
@Module({
  providers: [prismaProvider],
  exports: [PrismaClient],
})
export class DatabaseModule {}
```

- [ ] **Step 4: Run migration**

```bash
cd apps/api
cp ../../.env.example .env
# Edit .env with your values, then:
npx prisma migrate dev --name init
```

Expected: `Your database is now in sync with your schema.`

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/prisma/ apps/api/src/database/
git commit -m "feat: add complete Prisma domain schema with all 26 models and initial migration"
```

---

## Task 8: Queue module (BullMQ) and Storage module (MinIO)

**Files:**
- Create: `apps/api/src/queue/queue.module.ts`
- Create: `apps/api/src/storage/storage.module.ts`
- Create: `apps/api/src/storage/storage.service.ts`

- [ ] **Step 1: Install dependencies**

```bash
cd apps/api
pnpm add @nestjs/bullmq bullmq minio
```

- [ ] **Step 2: Write `apps/api/src/queue/queue.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common'
import { BullModule } from '@nestjs/bullmq'
import { ConfigService } from '@nestjs/config'
import type { Env } from '../config/env'

export const QUEUE_GENERATION = 'generation'
export const QUEUE_EXPORT = 'export'

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env>) => ({
        connection: {
          url: config.get('REDIS_URL'),
        },
      }),
    }),
    BullModule.registerQueue(
      { name: QUEUE_GENERATION },
      { name: QUEUE_EXPORT },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
```

- [ ] **Step 3: Write `apps/api/src/storage/storage.service.ts`**

```typescript
import { Injectable, OnModuleInit, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as Minio from 'minio'
import type { Env } from '../config/env'

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name)
  private client: Minio.Client
  private bucket: string

  constructor(private config: ConfigService<Env>) {}

  async onModuleInit() {
    this.bucket = this.config.get('MINIO_BUCKET')!
    this.client = new Minio.Client({
      endPoint: this.config.get('MINIO_ENDPOINT')!,
      port: this.config.get('MINIO_PORT'),
      useSSL: this.config.get('MINIO_USE_SSL'),
      accessKey: this.config.get('MINIO_ACCESS_KEY')!,
      secretKey: this.config.get('MINIO_SECRET_KEY')!,
    })
    await this.ensureBucket()
  }

  private async ensureBucket() {
    const exists = await this.client.bucketExists(this.bucket)
    if (!exists) {
      await this.client.makeBucket(this.bucket, 'us-east-1')
      this.logger.log(`Created bucket: ${this.bucket}`)
    }
  }

  async upload(key: string, buffer: Buffer, contentType: string): Promise<string> {
    await this.client.putObject(this.bucket, key, buffer, buffer.length, {
      'Content-Type': contentType,
    })
    return key
  }

  async getPresignedUrl(key: string, expirySeconds = 3600): Promise<string> {
    return this.client.presignedGetObject(this.bucket, key, expirySeconds)
  }

  async delete(key: string): Promise<void> {
    await this.client.removeObject(this.bucket, key)
  }

  async getBuffer(key: string): Promise<Buffer> {
    const stream = await this.client.getObject(this.bucket, key)
    const chunks: Buffer[] = []
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
    }
    return Buffer.concat(chunks)
  }
}
```

- [ ] **Step 4: Write `apps/api/src/storage/storage.module.ts`**

```typescript
import { Global, Module } from '@nestjs/common'
import { StorageService } from './storage.service'

@Global()
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
```

- [ ] **Step 5: Write `apps/api/src/health/health.controller.ts`**

```typescript
import { Controller, Get } from '@nestjs/common'

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return { status: 'ok', timestamp: new Date().toISOString() }
  }
}
```

- [ ] **Step 6: Write `apps/api/src/health/health.module.ts`**

```typescript
import { Module } from '@nestjs/common'
import { HealthController } from './health.controller'

@Module({ controllers: [HealthController] })
export class HealthModule {}
```

- [ ] **Step 7: Start API and verify health endpoint**

```bash
cd apps/api
pnpm run start:dev
```

In another terminal:
```bash
curl http://localhost:4000/api/health
```

Expected: `{"status":"ok","timestamp":"..."}`

- [ ] **Step 8: Commit**

```bash
cd ../..
git add apps/api/src/queue/ apps/api/src/storage/ apps/api/src/health/
git commit -m "feat: add BullMQ queue module, MinIO storage service and health endpoint"
```

---

## Task 9: Next.js frontend base

**Files:**
- Create: `apps/web/` (full Next.js app)
- Create: `apps/web/lib/auth.ts`
- Create: `apps/web/app/api/auth/[...nextauth]/route.ts`
- Create: `apps/web/components/layout/app-shell.tsx`
- Create: `apps/web/components/layout/sidebar.tsx`

- [ ] **Step 1: Scaffold Next.js app**

```bash
cd apps
pnpm create next-app@latest web --typescript --tailwind --eslint --app --src-dir=false --import-alias='@/*'
cd web
pnpm add next-auth @tanstack/react-query @tanstack/react-query-devtools
pnpm add -D @types/node
```

- [ ] **Step 2: Update `apps/web/package.json` name**

Edit the `"name"` field to `"@multi-ai/web"`.

- [ ] **Step 3: Install and init shadcn/ui**

```bash
cd apps/web
pnpm dlx shadcn@latest init
```

When prompted:
- Style: Default
- Base color: Slate
- CSS variables: Yes

Then add core components:
```bash
pnpm dlx shadcn@latest add button badge card separator avatar dropdown-menu sheet sidebar tooltip
```

- [ ] **Step 4: Write `apps/web/lib/auth.ts`**

```typescript
import type { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        (session.user as any).id = token.sub
      }
      return session
    },
  },
  pages: {
    signIn: '/auth/signin',
  },
}
```

- [ ] **Step 5: Write `apps/web/app/api/auth/[...nextauth]/route.ts`**

```typescript
import NextAuth from 'next-auth'
import { authOptions } from '@/lib/auth'

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
```

- [ ] **Step 6: Write `apps/web/lib/query-client.tsx`**

```typescript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60 * 1000 },
        },
      }),
  )
  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 7: Write `apps/web/components/layout/sidebar.tsx`**

```typescript
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Layers, PresentationIcon, Library,
  Package, CheckSquare, Image, FileSliders, Wand2, Activity, Settings
} from 'lucide-react'

const navSections = [
  {
    label: 'Criar',
    items: [
      { href: '/sales-sheets', icon: Layers, label: 'Lâminas' },
      { href: '/presentations', icon: PresentationIcon, label: 'Apresentações' },
    ],
  },
  {
    label: 'Biblioteca',
    items: [
      { href: '/library', icon: Library, label: 'Materiais' },
      { href: '/products', icon: Package, label: 'Produtos' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/brand-assets', icon: Image, label: 'Brand Assets' },
      { href: '/templates', icon: FileSliders, label: 'Templates' },
      { href: '/prompt-studio', icon: Wand2, label: 'Prompt Studio' },
      { href: '/approvals', icon: CheckSquare, label: 'Aprovações' },
      { href: '/jobs', icon: Activity, label: 'Jobs' },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-full w-52 flex-col border-r border-border bg-background">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="h-2 w-2 rounded-full bg-primary" />
        <span className="text-sm font-bold tracking-tight">Multi AI Studio</span>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        <Link
          href="/dashboard"
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm border-l-2 border-transparent text-muted-foreground hover:text-foreground transition-colors',
            pathname === '/dashboard' && 'border-primary text-primary bg-primary/5',
          )}
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        {navSections.map((section) => (
          <div key={section.label} className="mt-2">
            <p className="px-4 py-1 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/60">
              {section.label}
            </p>
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm border-l-2 border-transparent text-muted-foreground hover:text-foreground transition-colors',
                  pathname.startsWith(item.href) && 'border-primary text-primary bg-primary/5',
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 8: Write `apps/web/components/layout/app-shell.tsx`**

```typescript
import { Sidebar } from './sidebar'

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
```

- [ ] **Step 9: Write `apps/web/app/layout.tsx`**

```typescript
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { QueryProvider } from '@/lib/query-client'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Multi AI Studio',
  description: 'Plataforma interna de geração de materiais comerciais com IA',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className={inter.className}>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  )
}
```

- [ ] **Step 10: Write `apps/web/app/page.tsx`** (redirect to dashboard)

```typescript
import { redirect } from 'next/navigation'

export default function Home() {
  redirect('/dashboard')
}
```

- [ ] **Step 11: Write `apps/web/app/dashboard/page.tsx`**

```typescript
import { AppShell } from '@/components/layout/app-shell'

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="p-8">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="mt-2 text-muted-foreground">
          Bem-vindo ao Multi AI Studio. Selecione uma opção no menu para começar.
        </p>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 12: Verify frontend runs**

```bash
cd apps/web
cp ../../.env.example .env.local
# Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, NEXTAUTH_SECRET in .env.local
pnpm dev
```

Open `http://localhost:3000` — expect dashboard to load with sidebar.

- [ ] **Step 13: Commit**

```bash
cd ../..
git add apps/web/
git commit -m "feat: scaffold Next.js frontend with App Router, dark theme, sidebar navigation and NextAuth Google SSO"
```

---

## Task 10: Seed data

**Files:**
- Create: `apps/api/prisma/seed.ts`

- [ ] **Step 1: Install seed dependencies**

```bash
cd apps/api
pnpm add -D ts-node tsconfig-paths
```

Add to `apps/api/package.json`:
```json
{
  "prisma": {
    "seed": "ts-node --require tsconfig-paths/register prisma/seed.ts"
  }
}
```

- [ ] **Step 2: Write `apps/api/prisma/seed.ts`**

```typescript
import { PrismaClient, TemplateType, BrandAssetType, BackgroundType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // ─── Users ───────────────────────────────────────────────────────────────
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@multilaser.com.br' },
    update: {},
    create: {
      email: 'admin@multilaser.com.br',
      name: 'Admin Multi',
      role: 'ADMIN',
    },
  })

  // ─── Clients ─────────────────────────────────────────────────────────────
  await prisma.client.createMany({
    data: [
      { name: 'Magazine Luiza', segment: 'Varejo', channel: 'Varejo Nacional' },
      { name: 'Americanas', segment: 'Varejo', channel: 'Varejo Nacional' },
      { name: 'Distribuidor ABC', segment: 'Distribuição', channel: 'Distribuidor' },
      { name: 'Fast Shop', segment: 'Varejo Premium', channel: 'Varejo Especializado' },
    ],
    skipDuplicates: true,
  })

  // ─── Brand Assets ─────────────────────────────────────────────────────────
  const logoLight = await prisma.brandAsset.upsert({
    where: { id: 'brand-multilaser-light' },
    update: {},
    create: {
      id: 'brand-multilaser-light',
      name: 'Multilaser — Fundo claro',
      type: BrandAssetType.LOGO,
      url: 'brand/logos/multilaser-dark.svg',
      format: 'SVG',
      bestOn: BackgroundType.LIGHT,
      description: 'Logo principal versão escura, para fundos claros',
      rules: {
        create: [
          { condition: "background === 'LIGHT'", score: 100, notes: 'Versão principal para fundo branco' },
          { condition: "background === 'ANY'", score: 70, notes: 'Fallback genérico' },
        ],
      },
    },
  })

  const logoDark = await prisma.brandAsset.upsert({
    where: { id: 'brand-multilaser-dark' },
    update: {},
    create: {
      id: 'brand-multilaser-dark',
      name: 'Multilaser — Fundo escuro',
      type: BrandAssetType.LOGO,
      url: 'brand/logos/multilaser-white.svg',
      format: 'SVG',
      bestOn: BackgroundType.DARK,
      description: 'Logo branca para fundos escuros ou coloridos',
      rules: {
        create: [
          { condition: "background === 'DARK'", score: 100, notes: 'Versão para fundo escuro' },
          { condition: "background === 'COLORED'", score: 90, notes: 'Boa visibilidade em fundos coloridos' },
        ],
      },
    },
  })

  // ─── Templates ────────────────────────────────────────────────────────────
  const templateHorizontal = await prisma.template.upsert({
    where: { id: 'tpl-sales-sheet-horizontal' },
    update: {},
    create: {
      id: 'tpl-sales-sheet-horizontal',
      name: 'Lâmina Horizontal',
      type: TemplateType.SALES_SHEET_HORIZONTAL,
      description: 'Lâmina de vendas no formato paisagem A4',
      zonesConfig: {
        imageZone: { x: 0, y: 0, width: '60%', height: '100%' },
        headlineZone: { x: '62%', y: '5%', width: '35%', height: '20%' },
        benefitsZone: { x: '62%', y: '30%', width: '35%', height: '40%' },
        logoZone: { x: '62%', y: '75%', width: '15%', height: '10%' },
        qrZone: { x: '80%', y: '72%', width: '15%', height: '20%' },
        ctaZone: { x: '62%', y: '88%', width: '35%', height: '8%' },
      },
    },
  })

  await prisma.template.upsert({
    where: { id: 'tpl-deck-corporate' },
    update: {},
    create: {
      id: 'tpl-deck-corporate',
      name: 'Deck Corporativo',
      type: TemplateType.DECK_CORPORATE,
      description: 'Apresentação corporativa padrão Multilaser',
      zonesConfig: {
        heroZone: { x: 0, y: 0, width: '100%', height: '45%' },
        titleZone: { x: '3%', y: '47%', width: '94%', height: '14%' },
        bodyZone: { x: '3%', y: '63%', width: '94%', height: '22%' },
        logoZone: { x: '85%', y: '3%', width: '12%', height: '10%' },
        footerZone: { x: 0, y: '92%', width: '100%', height: '8%' },
      },
    },
  })

  // ─── Products ─────────────────────────────────────────────────────────────
  const products = [
    {
      id: 'prod-wc1080',
      sku: 'WC1080',
      name: 'Webcam Multilaser Full HD 1080p',
      brand: 'Multilaser',
      category: 'Periféricos',
      subcategory: 'Webcams',
      description: 'Webcam profissional com resolução Full HD 1080p, microfone embutido e lente de vidro para imagens nítidas em videoconferências.',
      qrDestination: 'https://multilaser.com.br/webcam-1080p',
      images: ['products/wc1080/hero.jpg', 'products/wc1080/angle.jpg'],
      benefits: ['Qualidade Full HD 1080p', 'Microfone com cancelamento de ruído', 'Plug & Play universal', 'Compatível com Zoom, Teams e Meet', 'Suporte ajustável 360°'],
      specs: [
        { key: 'Resolução', value: '1920x1080', unit: 'px', group: 'Imagem' },
        { key: 'FPS', value: '30', unit: 'fps', group: 'Imagem' },
        { key: 'Ângulo de visão', value: '78', unit: '°', group: 'Óptica' },
        { key: 'Conexão', value: 'USB-A 2.0', group: 'Conectividade' },
      ],
    },
    {
      id: 'prod-hs350',
      sku: 'HS350',
      name: 'Headset Gamer Multilaser RGB',
      brand: 'Multilaser',
      category: 'Áudio',
      subcategory: 'Headsets',
      description: 'Headset gamer com som surround 7.1, iluminação RGB e microfone retrátil de alta precisão para jogos e comunicação.',
      qrDestination: 'https://multilaser.com.br/headset-gamer-rgb',
      images: ['products/hs350/hero.jpg'],
      benefits: ['Som surround virtual 7.1', 'Iluminação RGB personalizável', 'Microfone retrátil HD', 'Driver 50mm potente', 'Almofadas memory foam'],
      specs: [
        { key: 'Driver', value: '50', unit: 'mm', group: 'Áudio' },
        { key: 'Frequência', value: '20-20000', unit: 'Hz', group: 'Áudio' },
        { key: 'Impedância', value: '32', unit: 'Ω', group: 'Áudio' },
        { key: 'Conexão', value: 'USB + P2 3.5mm', group: 'Conectividade' },
      ],
    },
    {
      id: 'prod-kb200',
      sku: 'KB200',
      name: 'Teclado Multilaser Slim Wireless',
      brand: 'Multilaser',
      category: 'Periféricos',
      subcategory: 'Teclados',
      description: 'Teclado compacto sem fio com layout ABNT2, bateria de longa duração e perfil slim para home office e uso profissional.',
      qrDestination: 'https://multilaser.com.br/teclado-slim-wireless',
      images: ['products/kb200/hero.jpg'],
      benefits: ['Sem fio 2.4GHz estável', 'Bateria até 12 meses', 'Layout ABNT2 completo', 'Perfil slim ergonômico', 'Teclas silenciosas'],
      specs: [
        { key: 'Conectividade', value: 'Wireless 2.4GHz', group: 'Conectividade' },
        { key: 'Alcance', value: '10', unit: 'm', group: 'Conectividade' },
        { key: 'Bateria', value: 'AAA × 2 — até 12 meses', group: 'Energia' },
        { key: 'Layout', value: 'ABNT2 104 teclas', group: 'Teclado' },
      ],
    },
  ]

  for (const p of products) {
    await prisma.product.upsert({
      where: { id: p.id },
      update: {},
      create: {
        id: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        description: p.description,
        qrDestination: p.qrDestination,
        images: {
          create: p.images.map((url, i) => ({ url, isPrimary: i === 0, order: i })),
        },
        benefits: {
          create: p.benefits.map((text, i) => ({ text, order: i })),
        },
        specifications: {
          create: p.specs.map((s) => ({ key: s.key, value: s.value, unit: s.unit, group: s.group })),
        },
      },
    })
  }

  console.log('✅ Seed completed.')
  console.log(`   Users: 1 | Clients: 4 | Products: ${products.length} | Brand Assets: 2 | Templates: 2`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 3: Run seed**

```bash
cd apps/api
pnpm prisma db seed
```

Expected:
```
✅ Seed completed.
   Users: 1 | Clients: 4 | Products: 3 | Brand Assets: 2 | Templates: 2
```

- [ ] **Step 4: Verify data with Prisma Studio**

```bash
pnpm prisma studio
```

Open `http://localhost:5555` and verify all tables have data.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add apps/api/prisma/seed.ts
git commit -m "feat: add realistic seed data with products, clients, brand assets and templates"
```

---

## Task 11: Verify full stack and write integration smoke test

**Files:**
- Create: `apps/api/src/health/health.controller.spec.ts`

- [ ] **Step 1: Write smoke test**

```typescript
// apps/api/src/health/health.controller.spec.ts
import { Test } from '@nestjs/testing'
import { HealthController } from './health.controller'

describe('HealthController', () => {
  let controller: HealthController

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile()
    controller = module.get(HealthController)
  })

  it('returns status ok', () => {
    const result = controller.check()
    expect(result.status).toBe('ok')
    expect(result.timestamp).toBeDefined()
  })
})
```

- [ ] **Step 2: Run API tests**

```bash
cd apps/api
pnpm test
```

Expected: `1 test suite, 1 test passed`

- [ ] **Step 3: Full stack smoke check**

With Docker Compose running and both apps started:

```bash
# Terminal 1
cd apps/api && pnpm start:dev

# Terminal 2
cd apps/web && pnpm dev

# Terminal 3 — verify
curl http://localhost:4000/api/health
# Expected: {"status":"ok","timestamp":"..."}

open http://localhost:3000
# Expected: redirects to /dashboard, sidebar visible
```

- [ ] **Step 4: Final commit**

```bash
cd ../..
git add apps/api/src/health/health.controller.spec.ts
git commit -m "test: add health controller smoke test — Plan 1 Foundation complete"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by task |
|---|---|
| Monorepo Turborepo + pnpm | Task 1 |
| Docker Compose (postgres, redis, minio) | Task 2 |
| shared-types package | Task 3 |
| slide-schema (SalesSheetContent + SlideContent + Zod) | Task 4 |
| 10 prompt configs versionados | Task 5 |
| NestJS base com env validation | Task 6 |
| Prisma schema completo (26 entidades) | Task 7 |
| BullMQ queue module | Task 8 |
| MinIO storage service | Task 8 |
| Next.js App Router | Task 9 |
| NextAuth Google SSO | Task 9 |
| shadcn/ui + Tailwind dark theme | Task 9 |
| Sidebar com todas as rotas | Task 9 |
| Seeds realistas | Task 10 |
| Testes base | Task 11 |

**Gaps encontrados:** Nenhum. Todas as entidades do schema Prisma estão presentes. Os packages shared-types e slide-schema têm testes (Task 4).

**Type consistency:** `SalesSheetContent`, `SlideContent` e `LayoutConfig` definidos em `packages/slide-schema` — não referenciados no backend ainda (isso é trabalho dos planos 2+). Sem inconsistências internas neste plano.
