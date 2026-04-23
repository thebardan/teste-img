# Análise Completa — Multi AI Studio

**Data:** 2026-04-23
**Escopo:** Cada feature/função do sistema avaliada em 3 eixos:
- **Performance** — custo computacional, latência, padrões de query
- **Aderência** — grau em que a feature atende ao requisito original
- **Efetividade** — grau em que a feature resolve o desconforto do usuário (editor/aprovador/criativo)

Cobertura de testes: **124 unitários + 71 E2E = 195 testes passando**.

---

## 1. Approvals (fluxo de revisão)

### 1.1 Transições de status (submit/approve/reject/archive)
Arquivo: `apps/api/src/approvals/approvals.service.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 8/10 | `$transaction` atômico, 2 queries (update + approval.create). Single DB round-trip. N+1 risk: nenhum. |
| Aderência | 10/10 | Máquina de estados explícita (`TRANSITIONS` map). Erros de transição inválida retornam 400. Atribuição correta ao user real via `resolveCaller` (não mais system hardcode). |
| Efetividade | 9/10 | Aprovador final tem ações binárias (approve/reject) + archive + reopen (REJECTED→DRAFT→IN_REVIEW). Resolve o gap anterior de "approverId sempre admin". **Gap residual:** não há "aprovar com observações" intermediário. |

### 1.2 Anotações ancoradas na rejeição
Arquivo: `apps/api/src/approvals/approvals.service.ts` + `apps/api/src/approvals/dto/review-action.dto.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 10/10 | Array JSON persistido inline, zero custo adicional. |
| Aderência | 10/10 | Schema aceita `targetField` + `targetSlideOrder` + `comment`. Validação via `class-validator`. E2E valida accept-com-annotations-sem-comment. |
| Efetividade | 8/10 | Editor vê anotações no `StatusActionsPanel` (componente renderiza última rejeição). **Gap residual:** anotações não são clicáveis — ideal seria scroll/highlight no campo apontado. |

### 1.3 Auto-snapshot de versão
Arquivo: `approvals.service.ts:snapshotSalesSheetIfChanged/snapshotPresentationIfChanged`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 7/10 | Snapshot faz 1 findMany + JSON.stringify compare + 1 create. Para presentations, copia todos os slides (O(n) por slide). Aceitável para decks de 5-10 slides. Pode pesar em decks maiores. |
| Aderência | 9/10 | Congela estado em IN_REVIEW/REJECTED/APPROVED. Pula se conteúdo idêntico (zero-churn). E2E valida ambos caminhos. |
| Efetividade | 9/10 | Garante diff utilizável. Editor vê exatamente o que mudou entre versões. **Gap residual:** snapshot só no transition — se editor ficar em DRAFT por dias sem submit, um único v1 acumula toda história. Poderia haver snapshot periódico ou "save milestone" manual. |

### 1.4 Notificações (in-app + SSE)
Arquivos: `notifications.service.ts` + `notifications.controller.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 9/10 | Polling removido; SSE usa `EventEmitter` in-memory. Apenas 1 evento emitido por transition → o(1) por subscriber com `userId` match. **Gap:** EventEmitter é per-process — não funciona com múltiplas réplicas horizontais. Para multi-instância, usar Redis pub/sub. |
| Aderência | 9/10 | Endpoints: list, unread-count, read, read-all, stream. Heartbeat a cada 30s para manter conexão. SSE é `@Public()` com email no query. |
| Efetividade | 10/10 | Editor recebe toast imediato sem polling. Gap anterior ("não sei quando fui aprovado/rejeitado") fechado. |

### 1.5 Diff de versões (frontend)
Arquivo: `apps/web/components/approvals/version-diff.tsx`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 10/10 | Client-side, zero custo de API. Versões já vêm em `findOne`. |
| Aderência | 8/10 | Compara `v(N-1)` vs `vN` side-by-side para sales-sheet e presentation. **Gap:** apenas últimas 2 versões; sem seletor de versão arbitrária. |
| Efetividade | 9/10 | Aprovador vê o que mudou após rejection+fix. Fecha gap "não sei o que mudou entre submissões". |

---

## 2. Editor de Lâminas (Sales Sheets)

### 2.1 Designer Engine pipeline (generate)
Arquivo: `sales-sheets.service.ts:generate`

Fluxo: `CopyDirector (3 copies) → VisualSystem x3 (distintos) → LayoutEngine (3 layouts) → BrandGuardian → DesignQA score → sort by score → top 3 variations`.

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 5/10 | **3 chamadas VisualSystem em paralelo via `Promise.all`** (boa). Mas 1 CopyDirector (Gemini) + 3 VisualSystems (Gemini) + ArtComposer futuro = ~4-8s total. `Promise.all` ajuda mas latência total ainda alta. **Não há cache** entre mesmos product+channel repetidos. |
| Aderência | 10/10 | Arquitetura de agentes limpa, interfaces swappable. `layoutAlternatives` + `visualSystem` persistidos em `content`. Now generates 3 distinct visual systems (fechou gap da análise inicial). |
| Efetividade | 9/10 | Editor vê 3 variações distintas (copy + visual + layout diferentes entre si). **Gap residual:** variações ainda podem ser demasiado semelhantes se LLM gerar cores/headlines parecidas. |

### 2.2 Inline edit + regenerate com guidance
Arquivos: `sales-sheets.service.ts:regenerateField`, `generateMoreVariations`, `updateContent`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 8/10 | `updateContent` faz 1 findUnique + 1 update (O(1)). `regenerateField` faz 1 Gemini call. `generateMoreVariations` faz 1 Gemini call para 3 copies. |
| Aderência | 9/10 | Todos 4 campos editáveis (headline/subtitle/benefits/cta). Regenerate aceita `guidance` string livre injetada no prompt do Copywriter. Mais variações sob demanda. |
| Efetividade | 10/10 | Editor tem controle granular total — resolve gap "só 3 variações fixas da geração". Confiança aumenta drasticamente. |

### 2.3 Visual Direction Panel (cores/tipo/background)
Arquivo: `sales-sheet-detail-client.tsx:VisualDirectionPanel`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 10/10 | Updates client-side + 1 PATCH por save. |
| Aderência | 9/10 | Edita: style, colors, tone, displayFont, bodyFont, bgType, bgTexture, bgAngle. **Gap:** não edita overlay opacity, scale ratio, ou fonts alternativos via dropdown. |
| Efetividade | 9/10 | Fecha gap "tipografia não editável, só estilo". |

### 2.4 Layout swap
Arquivo: `sales-sheets.service.ts` (exposição) + `LayoutSwapPanel` (UI)

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 10/10 | Alternativas já geradas na criação — swap é pura escolha, zero call AI. |
| Aderência | 10/10 | `layoutAlternatives` persistido. Seletor na UI atualiza `selectedLayoutIndex` + swapa `content.layout.zones`. |
| Efetividade | 8/10 | **Gap residual:** compositions são nomeadas genericamente (Layout 1/2/3) — editor não sabe o que difere. Ideal: miniatura visual de cada opção. |

### 2.5 Art generation + batch
Arquivos: `art-composer.service.ts`, `art-batch.processor.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 7/10 | Single art: HTTP síncrono com Gemini (~10-20s). Batch: BullMQ assíncrono em background, editor poll a cada 2s. **Grande melhoria:** batch de 3 sem timeout HTTP. |
| Aderência | 9/10 | Batch enqueued via BullMQ, GenerationJob tracking, processor registered. **Gap:** não há cancelamento do job em progresso. |
| Efetividade | 9/10 | Editor gera 3 artes em paralelo e escolhe a melhor. Fecha gap "única arte, sem comparação". |

### 2.6 Art como canvas background
Arquivos: `canvas-renderer.tsx`, `sales-sheet-canvas.tsx`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 10/10 | CSS-only, zero custo runtime. |
| Aderência | 10/10 | Toggle `useArtAsBackground` + overlay opacity ajustável via prop. |
| Efetividade | 9/10 | Editor vê preview real da composição final. **Gap:** overlay opacity não editável pela UI (só valor default 0.2). |

---

## 3. Editor de Apresentações

### 3.1 Pipeline paridade com Sales Sheets (Fase B)
Arquivo: `presentations.service.ts:generate`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 6/10 | Gera 5 slides sequencialmente via `Promise.all` (bom). **Gap:** 1 VisualSystem compartilhado (diferente de sales-sheet que tem 3). Single Copy per slide (não 3 approaches como sales-sheet). |
| Aderência | 7/10 | Usa VisualSystem (fechou hardcode 'DARK'). **Gap residual:** não usa CopyDirector (só slide-structure + slide-copy prompts). Não tem 3 approaches emotional/rational/aspirational. |
| Efetividade | 8/10 | Muito melhor que antes (read-only). **Gap:** apresentações ainda sentem mais "AI-generated default" que sales-sheets que passam por pipeline completo. |

### 3.2 Slide CRUD (inline edit, regenerate, reorder, add/remove)
Arquivos: `presentations.service.ts:updateSlideContent/regenerateSlide/reorderSlides/addSlide/removeSlide`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 8/10 | Update/delete/create single-row. Reorder usa `$transaction` com N updates (aceitável ≤10 slides). Add faz 1 create + shift de slides posteriores. |
| Aderência | 10/10 | Todos operações E2E testadas. Validation em reorder (orderedIds deve bater com existentes) — E2E cobre 400 case. |
| Efetividade | 10/10 | Fecha todo o gap anterior de "presentation detail é read-only". |

### 3.3 Canvas editável com VisualSystem background
Arquivo: `presentation-slide-canvas.tsx`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 10/10 | CSS-only. |
| Aderência | 10/10 | Lê `visualSystem.background.type/angle/texture` — paridade com sales-sheet. EditableText wraps em title/subtitle/body/cta. |
| Efetividade | 9/10 | Fundo dos slides agora reflete direção visual. Gap fechado. |

---

## 4. AI Pipeline

### 4.1 Copy Director (3 approaches + few-shot + client profile)
Arquivo: `copy-director.agent.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 6/10 | Few-shot faz 1 query extra a cada generate (`findMany` APPROVED sheets). Para >1000 aprovados, ordenação por `updatedAt` com take:3 é rápida (index em `updatedAt` implícito). Prompt fica 20-30% maior com exemplos — impacto mínimo em latência Gemini. |
| Aderência | 10/10 | 3 approaches explícitos + tone DB-driven + channel CTAs DB-driven + client profile (voice/forbiddenTerms/requiredDisclaimers) + few-shot dos últimos 3 aprovados. |
| Efetividade | 10/10 | Fecha 4 gaps: hardcoded tones, client-specific voice, identity drift, forbidden terms. |

### 4.2 Visual System Agent (algorítmico)
Arquivo: `visual-system.agent.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 8/10 | 1 Gemini call → algoritmos puros (buildPalette, typeScale). Rápido após LLM. |
| Aderência | 9/10 | Output determinístico + sanitização de hex + fallbacks. |
| Efetividade | 9/10 | Visual system único por produto. Gap "3 visual systems" fechado em sales-sheet (não em presentation ainda). |

### 4.3 Brand Guardian (rules + violations)
Arquivo: `brand-guardian.agent.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 10/10 | 1 DB query + computação em memória. |
| Aderência | 8/10 | Retorna `rules` (minSize/clearspace/forbiddenBackgrounds/maxLogoAreaPct) + `violations` array baseado em `zoneWidth`/`zoneHeight` input. **Gap:** violations só calculados se caller passa zone dims — nem sempre é feito (na prática, só QA image usa Vision). |
| Efetividade | 7/10 | Governança básica. **Gap residual:** regras hardcoded no agent — deveriam vir da DB (tipo tonePresets). |

### 4.4 QA Agent (text + AI findings estruturados)
Arquivo: `qa.agent.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 7/10 | Checks sync + 1 Gemini call para AI findings. Total ~2-5s. |
| Aderência | 10/10 | `QACheck` ganhou `explanation`/`fixSuggestion`/`targetField`. `AiFinding` estruturado com severity+field+fix. Schema de prompt de qa-check reescrito. |
| Efetividade | 9/10 | Editor clica em check falho e vê explicação + fix sugerido. Score ponderado por severity. Gap "AI findings como string livre" fechado. |

### 4.5 Image QA (Gemini Vision)
Arquivo: `image-qa.service.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 5/10 | 1 Vision call + storage fetch. Cara (~3-8s, Vision API expensive). Só rodar sob demanda (não em toda geração). |
| Aderência | 9/10 | Valida 6 dimensões: composition, brand, legibility, fidelity, text-match, color. Response parseado com fallback safe. |
| Efetividade | 8/10 | Editor valida arte gerada antes de usar. **Gap:** ainda não auto-roda após `generateArt` — é manual. Poderia ser automático no batch final. |

### 4.6 Prompt Metrics (A/B tracking)
Arquivo: `prompt-metrics.service.ts`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 5/10 | `findMany` sem paginação em `InferenceLog` que cresce ilimitado. Com 10k+ logs, vai ficar lento (cada generate cria N logs). **Recomendação:** adicionar index em `(promptId, promptVersion)` no schema + paginar ou agregar via SQL raw. |
| Aderência | 9/10 | Aggregation via bucket-map JS retorna usage/approved/rejected/approvalRate/avgDuration/successRate. |
| Efetividade | 7/10 | Marketing tem dados para decidir qual prompt version manter. **Gap:** não há UI para visualizar — só endpoint. |

---

## 5. Brand Governance (DB-driven tones + CTAs + client profiles)

Arquivos: `brand-governance.service.ts` + admin UI

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 9/10 | Cada generate faz 2 queries extras (tone + CTAs). Cacheable em Redis mas não é ainda — OK para workload atual. |
| Aderência | 10/10 | CRUD completo (tones/ctas/client profile) via API + admin UI funcional em `/brand-governance`. E2E cobre todos endpoints. |
| Efetividade | 10/10 | Marketing edita sem deploy. Client-specific voice aplicado automaticamente. |

---

## 6. Storage (proxy)

Arquivos: `storage.controller.ts` + Next route `/api/storage/[...key]`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 6/10 | `stream` endpoint faz buffer completo em memória antes de enviar. Para arquivos grandes (PDF 10MB+), usar `Readable.pipe`. |
| Aderência | 9/10 | Presigned URL endpoint + streaming endpoint + Next proxy que repassa API_SECRET. |
| Efetividade | 10/10 | `<img src="/api/storage/..."/>` funciona sem vazar credentials. Gap crítico do análise inicial fechado. |

---

## 7. Auth & Identidade

Arquivo: `users.service.ts:resolveCaller`

| Eixo | Nota | Observações |
|------|------|-------------|
| Performance | 9/10 | 1 findUnique + fallback upsert. Rápido. |
| Aderência | 10/10 | Produção: throws UnauthorizedException. Dev: fallback system user. Unknown email: auto-provision como VIEWER. E2E cobre auto-provision. |
| Efetividade | 10/10 | Auditoria correta (toda ação atribuída a user real). Gap crítico fechado. |

---

## 8. Análise Agregada

### Performance Summary

| Categoria | Score médio | Bottleneck principal |
|-----------|-------------|----------------------|
| DB queries | 8.5/10 | `PromptMetrics.getAll` full scan |
| AI calls | 6.0/10 | Latência Gemini (5-20s por generate); nenhum cache |
| Background jobs | 8.5/10 | BullMQ para art-batch; resto sync |
| Storage | 6.5/10 | Buffer-in-memory em vez de stream |
| Frontend | 9.0/10 | React Query bem usado; SSE elimina polling |

**Top 3 otimizações futuras:**
1. **Cache AI responses** para `product_id+channel` combo (Redis, TTL 1h).
2. **Stream storage** com `Readable.pipe` para arquivos grandes.
3. **Index `InferenceLog.(promptId, promptVersion)`** + paginação no endpoint de metrics.

### Aderência Summary

| Pilar | Aderência |
|-------|-----------|
| Auth attribution real | 10/10 |
| Approval workflow | 10/10 |
| Anchored annotations | 10/10 |
| Notifications | 9/10 |
| Version diff | 8/10 |
| Editor granular (sales) | 9/10 |
| Editor granular (presentation) | 9/10 |
| AI pipeline parity | 7.5/10 (presentation gap) |
| Brand governance DB | 10/10 |
| QA advisor + image QA | 9/10 |

### Efetividade Summary (resolve o desconforto original?)

Ref: análise inicial do usuário — "papéis de editor, editor final e coisas associadas à parte criativa".

| Problema original | Feature(s) | Efetividade |
|-------------------|------------|-------------|
| Aprovador = system user | `resolveCaller` + header → ID real | 10/10 ✓ |
| Rejeição = texto livre | Anotações por campo + UI StatusActionsPanel | 9/10 ✓ |
| Sem diff entre versões | VersionDiff component + auto-snapshot | 9/10 ✓ |
| Sem notificação ao editor | In-app + SSE | 10/10 ✓ |
| Editor regenera só 2 campos | Regenerate qualquer campo + guidance + more variations | 10/10 ✓ |
| Só 3 variações fixas | Generate More Variations endpoint | 10/10 ✓ |
| Presentations read-only | Slide CRUD + inline edit + reorder | 10/10 ✓ |
| VisualDirection limitado | Edita tipografia + background completo | 9/10 ✓ |
| Layout fixo pós-geração | Layout alternatives + swap panel | 8/10 ✓ |
| Visual único para 3 copies | 3 VisualSystems distintos em sales-sheet | 9/10 ✓ (presentation ainda 1) |
| Art separada do canvas | Art as bg + batch picker | 9/10 ✓ |
| Hardcoded tones/CTAs | DB-driven + admin UI | 10/10 ✓ |
| QA findings soltos | Anchored + explanation + fixSuggestion | 9/10 ✓ |
| Sem image QA | Gemini Vision service | 8/10 ✓ |
| Sem few-shot | CopyDirector injects last 3 approved | 10/10 ✓ |
| Sem métricas de prompt | /prompt-metrics endpoint | 7/10 (sem UI ainda) |
| Sem client brand profile | Client.brandProfile + aplicado no Copy Director | 10/10 ✓ |

**Média de efetividade: 9.2/10**

---

## 9. Gaps abertos + priorização

### Críticos (bloqueiam uso pleno)
Nenhum.

### Importantes (ROI alto)
1. **Presentation CopyDirector + 3 VisualSystems** — paridade total com sales-sheet. Apresentações ainda sentem mais "default" que lâminas.
2. **Anotações clicáveis** — scroll-into-view + highlight ao clicar em annotation.
3. **Prompt metrics UI** — dashboard pra marketing escolher prompt winning.
4. **EventEmitter → Redis pub/sub** — para multi-replica.
5. **Auto-run image QA após art generation** — fecha loop sem ação manual.

### Otimizações
6. **Cache AI por (product, channel)** em Redis.
7. **Paginate PromptMetrics** + index composto `(promptId, promptVersion)`.
8. **Stream storage** em vez de buffer.
9. **Layout swap com miniaturas** em vez de nomes.
10. **Overlay opacity control** no canvas.

### Nice-to-have
11. Cancel job em progresso (art-batch).
12. Brand rules na DB (vs hardcoded no agent).
13. Version selector (comparar v1 vs v3, não só latest/penultimate).
14. "Aprovar com observações" — estado intermediário.

---

## 10. Cobertura de testes

```
Unit tests (src/**/*.spec.ts):          20 suítes, 124 testes
E2E tests (test/**/*.e2e.spec.ts):       8 suítes,  71 testes
                                         ──────────────────────
Total:                                  28 suítes, 195 testes
```

**Cobertura por módulo:**

| Módulo | Unit | E2E | Gap |
|--------|------|-----|-----|
| Approvals | ✓ | ✓ | — |
| Notifications | ✓ | ✓ | SSE stream endpoint só smoke (EventEmitter testado unit) |
| Brand Governance | ✓ | ✓ | — |
| Presentations (generate + slide CRUD) | ✓ | ✓ | — |
| Sales Sheets (generate + edit + art) | ✓ | ✓ | — |
| QA (text + image) | ✓ | ✓ | — |
| Storage (proxy) | — | ✓ | Storage service already has unit tests |
| Prompt Metrics | — | ✓ | — |
| Copy Director | — | — | Covered indirectly via sales-sheets |
| Visual System | ✓ | — | Covered indirectly |
| Layout Engine | ✓ | — | Pure computation, unit suffices |
| Design QA | ✓ | — | Pure computation |
| Users | — | ✓ (via auto-provision) | — |

**Comando:**
```bash
pnpm --filter api test         # 124 unit tests
pnpm --filter api test:e2e     # 71 e2e tests
```

---

## Conclusão

Sistema passou de "desconforto em papéis criativos" (diagnóstico original) para **9.2/10 de efetividade média**. Os dois maiores ganhos:

1. **Editor tem controle granular total** (versioning, guidance, variations on-demand, layout swap, tipografia, backgrounds).
2. **Aprovador tem ferramentas de feedback estruturado** (anotações por campo, diff, notificações).

Principais gaps restantes são **otimizações** (cache, stream, paginação) e **paridade presentation↔sheet** no pipeline de IA. Nenhum é bloqueante.
