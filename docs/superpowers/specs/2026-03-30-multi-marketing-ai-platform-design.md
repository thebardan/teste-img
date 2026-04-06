# Multi Marketing AI Platform — Design Spec
**Data:** 2026-03-30
**Produto:** Multi AI Studio
**Cliente:** Multi / Multilaser — área de Marketing interno

---

## 1. Missão

Plataforma interna de geração de materiais comerciais com IA para o time de Marketing da Multilaser. Dois produtos integrados:

- **Produto A — Sales Sheet Generator**: gera lâminas de vendas comerciais a partir de dados estruturados de produto
- **Produto B — Presentation Builder**: monta apresentações comerciais em PPTX e PDF com narrativa comercial orientada por IA

Ambos compartilham catálogo de produtos, brand assets, motor de prompts, agentes, templates, pipeline de imagem, versionamento, aprovações, exportação e rastreabilidade.

---

## 2. Contexto e decisões

| Decisão | Escolha | Razão |
|---|---|---|
| Deployment | Servidor interno (on-premises) | Requisito da empresa |
| Auth | Google Workspace SSO via NextAuth.js | SSO corporativo já existente |
| File storage | MinIO (S3-compatible self-hosted) | On-premises, S3-compatible para futura migração |
| IA — texto | Google Gemini API (`gemini-2.0-flash`) | Chave ativa disponível |
| IA — imagem | Google Gemini (`gemini-2.0-flash-preview-image-generation`) | Mesmo provedor, adapter desacoplado |
| Branding | Marca única (Multilaser + variantes/linhas) | Escopo inicial; arquitetura suporta expansão |
| Monorepo | Turborepo + pnpm workspaces | DX, cache de build, shared packages |

---

## 3. Arquitetura macro

### Estrutura do monorepo

```
/
├── apps/
│   ├── web/          # Next.js 14 App Router — frontend
│   └── api/          # NestJS — backend
├── packages/
│   ├── shared-types/ # DTOs e tipos compartilhados
│   ├── slide-schema/ # SlideContent canônico (Zod + TypeScript)
│   ├── prompt-configs/ # Arquivos de prompt versionados
│   └── ui/           # Componentes shadcn/ui compartilhados
├── infra/
│   └── docker-compose.yml
└── turbo.json
```

### Stack

**Frontend (`apps/web`)**
- Next.js 14 com App Router
- React, TypeScript, Tailwind CSS, shadcn/ui
- TanStack Query, React Hook Form, Zod
- NextAuth.js (Google OAuth)

**Backend (`apps/api`)**
- NestJS, TypeScript
- Prisma ORM + PostgreSQL
- Redis + BullMQ (filas e jobs assíncronos)
- MinIO SDK (S3-compatible)

**Exportação**
- Playwright headless → PNG, JPEG, PDF (da lâmina/slide HTML)
- PptxGenJS → PPTX (a partir do Slide Schema JSON)
- qrcode lib server-side para geração de QR

**IA**
- Adapters desacoplados: `TextGenerationProvider`, `ImageGenerationProvider`
- Implementações: `GeminiTextProvider`, `GeminiImageProvider`
- Troca de provider sem alterar agentes

---

## 4. Princípio técnico central: composição determinística

**A IA nunca entrega o artefato final sozinha.**

| IA faz | Sistema faz deterministicamente |
|---|---|
| Copy comercial (headline, subtítulo, benefícios, CTA) | Posicionamento de todos os elementos |
| Narrativa e estrutura dos slides | Margens, grid, safe areas |
| Direção de arte e prompt visual | Seleção e posicionamento de logo |
| Geração do asset visual (Gemini) | Geração e posicionamento do QR |
| | Export (PNG, PDF, PPTX) |
| | Consistência visual entre preview e output |

---

## 5. Motor de composição (Approach C)

### Pipeline

```
Input usuário
    → Agentes de IA (copy · imagem · direção visual)
    → Slide Schema JSON (fonte de verdade, validado por Zod)
    → React Renderer (preview live no browser)
         → Playwright screenshot → PNG / PDF
    → PptxGenJS Builder → PPTX profissional
```

### Schemas canônicos (`packages/slide-schema`)

O package exporta dois schemas distintos, um por produto:

**`SalesSheetContent`** — lâmina de vendas (página única)
```typescript
type SalesSheetContent = {
  headline: string
  subtitle?: string
  benefits: string[]            // 3 a 5 itens
  cta: string
  productImageUrl: string       // foto real do produto (MinIO)
  generatedVisualUrl?: string   // asset gerado pelo Gemini (MinIO)
  logoAssetId: string           // FK BrandAsset
  qrUrl: string
  layout: SalesSheetLayoutConfig // zones: image, headline, benefits, logo, qr, cta
}
```

**`SlideContent`** — slide de apresentação (16:9)
```typescript
type SlideContent = {
  type: 'cover' | 'context' | 'products' | 'benefits' | 'closing'
  title: string
  subtitle?: string
  body?: string[]               // bullet points
  heroImageUrl?: string         // ref MinIO (produto ou gerado)
  logoAssetId?: string          // FK BrandAsset
  qrUrl?: string
  cta?: string
  products?: SlideProduct[]
  comparatives?: Comparative[]  // sempre flagged para revisão humana
  layout: SlideLayoutConfig     // grid, margens, safe-area do template
}
```

Na `SalesSheetContent`, a `Image Zone` compõe `productImageUrl` (produto real) e `generatedVisualUrl` (asset Gemini) em camadas — o sistema determina a composição deterministicamente com base no template.

### Template zones (lâmina de vendas)

Cada template define zonas com posicionamento absoluto:
- **Image Zone** — asset visual gerado pela IA + foto do produto
- **Headline Zone** — headline + subtítulo
- **Benefits Zone** — 3 a 5 benefícios
- **Logo Zone** — logo selecionada pelo BrandGuardianAgent
- **QR Zone** — QR gerado server-side com destino configurável
- **CTA Zone** — call to action

Templates disponíveis: horizontal, vertical, A4, deck corporativo, deck varejo, deck premium, deck distribuidor.

---

## 6. Modelo de dados

### Domínios

**Identidade:** `User`, `Role`, `Client`
**Catálogo:** `Product`, `ProductImage`, `ProductSpecification`, `ProductBenefit`, `ProductClaim`, `ProductPackaging`, `ProductLink`, `ProductVariant`
**Brand:** `BrandAsset`, `BrandRule`, `Template`, `TemplateVariant`
**Outputs:** `SalesSheet`, `SalesSheetVersion`, `Presentation`, `PresentationVersion`, `PresentationSlide`, `ExportedArtifact`
**IA & Geração:** `GenerationJob`, `PromptTemplate`, `InferenceLog`
**Governança:** `Approval`, `AuditLog`

### Decisões de design

**Versionamento imutável:** `SalesSheet` e `Presentation` são capas mutáveis. Cada geração ou edição cria uma nova `Version` imutável com snapshot completo do conteúdo, prompts usados e assets referenciados. Nada é sobrescrito.

**InferenceLog:** Cada chamada à IA persiste o par prompt/resposta vinculado à `Version`. Garante auditoria completa e permite replay de qualquer geração passada.

**ExportedArtifact:** Cada arquivo gerado (PNG, PDF, PPTX) é registrado com path no MinIO, tipo, tamanho e `versionId` de origem. Downloads apontam para o artifact, nunca regeram.

**PresentationSlide:** Armazena o `SlideContent` como JSON (`slide-schema`). É a fonte de verdade para React renderer e PptxGenJS builder.

### State machine de aprovação

```
DRAFT → IN_REVIEW → APPROVED → ARCHIVED
                 ↘ REJECTED → (nova Version, volta para DRAFT)
```

### Rastreabilidade por artefato gerado

Todo artefato registra: usuário, cliente, produto(s), template, logo escolhida, QR target, prompt usado, provider/modelo IA, timestamp, arquivos gerados no MinIO, status e aprovação.

---

## 7. Camada de orquestração de IA

### Provider abstraction

```
TextGenerationProvider     ← GeminiTextProvider
ImageGenerationProvider    ← GeminiImageProvider
PromptRenderer             — carrega config, injeta variáveis, retorna string
ResponseValidator          — parse estruturado + Zod + retries + fallback
```

### Agentes

| Agente | Responsabilidade |
|---|---|
| `OrchestratorAgent` | Coordena o pipeline, identifica gaps de dados |
| `ProductRetrieverAgent` | Busca e estrutura dados do produto |
| `SalesCopywriterAgent` | Gera headline, subtítulo, benefícios, CTA |
| `BrandGuardianAgent` | Seleciona logo por score (contraste, fundo, categoria) |
| `VisualDirectorAgent` | Cria direção de arte e prompt de imagem |
| `ImageGeneratorAgent` | Chama Gemini Image, persiste asset no MinIO |
| `SlideStrategistAgent` | Define narrativa e estrutura dos 5 slides |
| `SlideComposerAgent` | Monta os `SlideContent` JSON por slide |
| `QAAgent` | Valida ortografia, contraste, overflow, CTA, QR, claims |

### Sequência — Sales Sheet Generator

1. `ProductRetrieverAgent` — dados do produto
2. `SalesCopywriterAgent` — headline · sub · benefits · CTA
3. `BrandGuardianAgent` — logo selecionada por score
4. `VisualDirectorAgent` — prompt visual + direção de arte
5. `ImageGeneratorAgent` — asset visual salvo no MinIO
6. `QAAgent` — flags e validação
7. `OrchestratorAgent` — monta `SlideContent` JSON final

### Sequência — Presentation Builder

1. `OrchestratorAgent` — identifica gaps, planeja estrutura
2. `ProductRetrieverAgent` — dados dos produtos selecionados
3. `SlideStrategistAgent` — narrativa comercial · estrutura 5 slides
4. `SalesCopywriterAgent` — copy por slide
5. `BrandGuardianAgent` — logo + paleta
6. `ImageGeneratorAgent` — hero visual (slide capa)
7. `SlideComposerAgent` — 5× `SlideContent` JSON
8. `QAAgent` — validação final

### Prompt configs (`packages/prompt-configs`)

Arquivos versionados separados do código:
`product-summary`, `sales-headline`, `benefits-generator`, `sales-sheet-copy`, `visual-direction`, `image-generation`, `slide-structure`, `slide-copy`, `comparison-generator`, `qa-check`

### Regras de resiliência

- Retry automático (3×) por agente
- Fallback configurável por agente
- Parse estruturado + validação Zod em todo output
- `InferenceLog` em toda chamada (prompt + resposta raw + parsed)
- Jobs assíncronos via BullMQ com status em tempo real

---

## 8. UX & Telas

### App name: Multi AI Studio

**Telas core**
| Tela | Descrição |
|---|---|
| Dashboard | Métricas, jobs recentes, ações rápidas |
| Sales Sheet Generator | Briefing (produto · template · logo · QR) + preview + versões + export |
| Presentation Builder | Wizard (cliente · produtos · foco) + preview por slide + export |
| Material Library | Lâminas e apresentações · filtros · status · download |
| Product Catalog | Tabela + cards · busca · filtros · detalhe |
| Approvals / Review | Fila de revisão · comentários · aprovar/rejeitar |

**Telas admin**
| Tela | Descrição |
|---|---|
| Brand Assets | Logos · variantes · regras de uso · preview por fundo |
| Templates Admin | Zones · variantes · preview |
| Prompt Studio | Editar · versionar · testar prompts |
| Jobs Monitor | Filas · status · erros · retry |

### Visual direction

Dark UI premium. Sidebar compacta com seções (Criar / Biblioteca / Admin). Tipografia clara, status badges, ações contextuais. Evitar dashboard genérico — o produto deve transmitir inteligência, sofisticação e clareza operacional.

---

## 9. Estrutura padrão de apresentação (5 slides)

| Slide | Tipo | Conteúdo |
|---|---|---|
| 1 | `cover` | Cliente · proposta · hero visual · branding |
| 2 | `context` | Racional comercial · encaixe no canal · proposta de valor |
| 3 | `products` | Produtos principais · dados técnicos resumidos · diferenciais |
| 4 | `benefits` | Argumentos de venda · comparativos (flagged) · vantagens competitivas |
| 5 | `closing` | Resumo · CTA · QR · próximos passos |

---

## 10. Plano de fases (14 fases)

| Fase | Entregável principal |
|---|---|
| 1 — Foundation | Monorepo, setup, auth, filas, Prisma base, design system base |
| 2 — Domain Model | Schema Prisma completo, migrations, seeds realistas |
| 3 — Product Catalog | Módulo de produtos backend + frontend (catálogo + detalhe) |
| 4 — Brand Assets | Módulo de brand + sistema de score de logo |
| 5 — AI Orchestration | Adapters, agentes, prompt engine, InferenceLog |
| 6 — Sales Sheet Generator | Fluxo completo: geração → preview → export → versioning |
| 7 — Presentation Builder | Wizard → agentes → preview por slide → PPTX + PDF |
| 8 — Template Engine | Motor de templates reutilizáveis com zones configuráveis |
| 9 — Export Engine | PNG · JPEG · PDF (Playwright) · PPTX (PptxGenJS) profissional |
| 10 — Approvals & Versioning | State machine · comentários · histórico · audit log |
| 11 — QA & Validation | QA Agent + checks automáticos + flags de revisão |
| 12 — Enterprise Hardening | RBAC · validação · logs · upload seguro · observabilidade |
| 13 — Tests | Unit · integration · e2e dos fluxos principais |
| 14 — Documentation | Arquitetura · setup · módulos · prompts · troubleshooting |

---

## 11. Checklist de sucesso (GSD)

### Foundation
- [ ] frontend sobe
- [ ] backend sobe
- [ ] banco conecta
- [ ] Redis/BullMQ funcionam
- [ ] MinIO conecta
- [ ] auth Google funciona

### Domain & Catalog
- [ ] schema Prisma robusto com todas as entidades
- [ ] seeds realistas (10+ produtos, logos, clientes, templates)
- [ ] catálogo navegável com busca e filtros

### AI
- [ ] prompts versionados em `packages/prompt-configs`
- [ ] todos os agentes implementados
- [ ] provider de texto e imagem desacoplado
- [ ] InferenceLog em toda inferência

### Sales Sheets
- [ ] fluxo completo gera lâmina end-to-end
- [ ] preview live funciona
- [ ] export PNG/PDF funciona
- [ ] versionamento imutável funciona

### Presentations
- [ ] fluxo completo gera apresentação
- [ ] preview por slide funciona
- [ ] PPTX exporta com qualidade
- [ ] PDF exporta consistente

### Governance
- [ ] state machine de aprovação funciona
- [ ] audit log completo
- [ ] QA checks automáticos com flags

### Quality
- [ ] testes base existem
- [ ] documentação existe
- [ ] `.env.example` completo
- [ ] projeto organizado e legível
