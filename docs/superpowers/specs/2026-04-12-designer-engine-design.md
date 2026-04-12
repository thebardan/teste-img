# Designer Engine — Multi AI Studio

**Data**: 2026-04-12
**Objetivo**: Transformar o Multi AI Studio de um montador de templates em um designer grafico inteligente que entrega pecas prontas (90%+) com variacoes para escolha.

**Modelo de uso**: O usuario seleciona um produto, escolhe o canal, e recebe 3 variacoes de lamina/apresentacao com qualidade profissional. Escolhe a melhor, faz ajustes finos opcionais, e exporta.

---

## 1. Copy Director

### Problema atual
Prompt unico generico pede "headline max 8 palavras". Resultado: copy corporativo sem personalidade que poderia ser de qualquer marca.

### Solucao
O Copy Director recebe contexto rico e gera copy com personalidade e tecnica de copywriting.

### Especificacao

**Perfis de tom por categoria** (mapa `CATEGORY_TONE`):
- Perifericos/gamer: tom agressivo, verbos de acao, linguagem competitiva. Ex: "Domine cada frame"
- Eletrodomesticos: tom acolhedor, foco em rotina/conforto. Ex: "Seu cafe, do jeito certo"
- Cameras/imagem: tom aspiracional, foco em experiencia. Ex: "Capture o que importa"
- Audio: tom imersivo, foco em sensacao. Ex: "Sinta cada nota"
- Informatica/notebooks: tom produtivo, foco em performance. Ex: "Seu proximo nivel"
- Smart home/IoT: tom futurista, foco em praticidade. Ex: "Sua casa, mais inteligente"
- Ferramentas/industrial: tom robusto, foco em confiabilidade. Ex: "Feito pra durar"

**Adaptacao por canal**:
- Varejo: linguagem direta e popular, foco em preco-beneficio
- Distribuidor: linguagem tecnica, foco em margem e giro
- Varejo Premium: linguagem aspiracional, foco em exclusividade
- E-commerce: linguagem de conversao, urgencia sutil, foco em diferenciais

**Frameworks de copywriting no prompt**:
O prompt instrui o modelo a usar tecnicas reais:
- PAS (Problem/Agitation/Solution) para headlines
- Before/After para subtitulos
- Feature-to-Benefit para lista de beneficios (nao listar spec, listar o que o usuario ganha)

**CTA contextualizado** (mapa `CHANNEL_CTA`):
- Varejo: "Disponivel na sua loja", "Confira na prateleira"
- Distribuidor: "Solicite cotacao", "Fale com o representante"
- Premium: "Experiencia exclusiva", "Descubra mais"
- E-commerce: "Compre agora", "Adicione ao carrinho"

**3 variacoes**:
O prompt pede 3 opcoes completas (headline + subtitle + benefits + cta) com abordagens distintas:
- Variacao emocional (foco em sentimento)
- Variacao racional (foco em specs/numeros)
- Variacao aspiracional (foco em lifestyle)

### Implementacao

**Arquivo**: `apps/api/src/ai/agents/copy-director.agent.ts` (substitui `sales-copywriter.agent.ts`)

**Interface de saida**:
```typescript
interface CopyDirectorOutput {
  variations: Array<{
    approach: 'emotional' | 'rational' | 'aspirational'
    headline: string
    subtitle: string
    benefits: string[]
    cta: string
  }>
  selectedIndex: number // recomendacao do agente
  toneProfile: {
    category: string
    channel: string
    voice: string // descricao do tom usado
  }
}
```

**Dependencias**: Recebe product (name, category, description, benefits, specs), channel, target audience.

---

## 2. Visual System Generator

### Problema atual
O Visual Director escolhe entre 7 estilos fixos (NEON TECH, CYBERPUNK, etc.) e retorna 3 hex. Todas as laminas de uma categoria ficam identicas.

### Solucao
Gera um sistema visual completo e unico por peca — paleta com harmonia cromatica, tipografia com escala modular, e direcao de background.

### Especificacao

**Paleta cromatica com harmonia**:
1. O modelo IA sugere uma cor dominante baseada no produto/categoria
2. O sistema calcula algoritmicamente:
   - Complementar (180 graus no circulo cromatico)
   - Analogas (30 graus de distancia)
   - Triadica (120 graus)
3. Seleciona o esquema que melhor combina com o tom emocional
4. Gera: `dominant`, `accent`, `neutral`, `background`, `text` (5 cores minimo)
5. Valida contraste WCAG AA (4.5:1) entre texto e background

**Funcao utilitaria**: `generateHarmony(baseHue: number, scheme: 'complementary' | 'analogous' | 'triadic'): string[]`
Usa conversao HSL para calcular angulos no circulo cromatico. Sem dependencia de IA para a matematica de cor.

**Escala tipografica modular**:
- Razao base configuravel: 1.125 (Major Second), 1.200 (Minor Third), 1.250 (Major Third), 1.333 (Perfect Fourth)
- A partir de um body size (16px), calcula todos os niveis:
  - `hero`: body * ratio^4
  - `headline`: body * ratio^3
  - `subtitle`: body * ratio^2
  - `body`: base
  - `caption`: body / ratio
  - `micro`: body / ratio^2

**Funcao utilitaria**: `generateTypeScale(baseSize: number, ratio: number): Record<string, number>`

**Font pairing**:
Mapa de pares por tom:
- Tech/gamer: Montserrat Bold + Inter Regular
- Premium/aspiracional: Playfair Display + Source Sans Pro
- Industrial/robusto: Oswald Bold + Open Sans
- Lifestyle/acolhedor: Poppins SemiBold + Nunito Regular
- Corporativo/neutro: Inter Bold + Inter Regular
- Editorial/sofisticado: DM Serif Display + DM Sans

**Background direction**:
- Tipo: `solid` | `gradient-linear` | `gradient-radial` | `mesh`
- Angulo de gradiente (0-360)
- Overlay: cor + opacidade para garantir legibilidade de texto
- Textura sutil opcional: `none` | `noise` | `grid` | `dots`

**Interface de saida**:
```typescript
interface VisualSystem {
  palette: {
    dominant: string
    accent: string
    neutral: string
    background: string
    backgroundSecondary: string
    text: string
    textSecondary: string
  }
  typography: {
    displayFont: string
    bodyFont: string
    scale: Record<'hero' | 'headline' | 'subtitle' | 'body' | 'caption' | 'micro', number>
    ratio: number
  }
  background: {
    type: 'solid' | 'gradient-linear' | 'gradient-radial' | 'mesh'
    colors: string[]
    angle?: number
    overlay: { color: string; opacity: number }
    texture: 'none' | 'noise' | 'grid' | 'dots'
  }
  mood: {
    style: string // descricao livre do estilo
    emotionalTone: string
    lightMode: boolean // claro ou escuro
  }
}
```

**Implementacao**: `apps/api/src/ai/agents/visual-system.agent.ts` + `apps/api/src/ai/utils/color-harmony.ts` + `apps/api/src/ai/utils/type-scale.ts`

A IA sugere cor dominante + mood. As funcoes utilitarias calculam o resto algoritmicamente. Hibrido IA + matematica.

---

## 3. Art Composer Pro

### Problema atual
Prompt vago ao Gemini ("clean, moderna, comercial"). Fotos de produto inseridas cruas sem tratamento. Resultado: imagens genericas.

### Solucao
Composicao por camadas com tratamento de produto e prompt cinematografico.

### Especificacao

**Pipeline de composicao (5 camadas)**:

1. **Background layer**:
   - Gerada a partir do `VisualSystem.background`
   - Se gradient: renderizado algoritmicamente (SVG ou Canvas API)
   - Se mesh: prompt ao Gemini pedindo apenas background abstrato (sem produto, sem texto)
   - Textura aplicada como overlay via Canvas API

2. **Product layer**:
   - Foto principal do produto enviada ao Gemini com prompt de tratamento:
     - Remocao de fundo (se necessario)
     - Geracao de sombra de contato realista
     - Reflexo sutil no plano
   - Posicionamento calculado pelo Layout Engine (regra dos tercos)
   - Fotos secundarias posicionadas como thumbnails com tratamento consistente

3. **Graphics layer**:
   - Elementos decorativos gerados pelo Gemini baseados na estetica:
     - Tech: linhas de circuito, particulas luminosas
     - Premium: formas geometricas sutis, linhas finas
     - Lifestyle: texturas organicas, curvas suaves
     - Industrial: patterns geometricos, angulos duros
   - Gerados como PNG transparente e compostos sobre o background

4. **Text layer**:
   - Renderizado pelo sistema (nao pelo Gemini) usando as fontes do Visual System
   - Headline, subtitle, benefits, CTA posicionados pelo Layout Engine
   - Sombra sutil em texto sobre fundos complexos para legibilidade
   - Texto NUNCA e renderizado pela IA de imagem (evita erros de OCR)

5. **Brand layer**:
   - Logo do Brand Assets posicionada com area de protecao (min 1x altura do logo em cada lado)
   - QR Code gerado via lib `qrcode` e posicionado

**Prompt cinematografico estruturado**:
Em vez de adjetivos vagos, o prompt descreve:
```
Iluminacao: [Rembrandt / split / butterfly / rim light]
Angulo: [hero shot 15 graus / flat lay / 3/4 view / eye level]
Profundidade: [f/2.8 bokeh / f/8 sharp / tilt-shift]
Ambiente: [descricao concreta da cena]
```

**3 variacoes**:
Cada geracao produz 3 composicoes com estilos visuais distintos derivados do Visual System (variando background type, angulo de gradiente, e estilo dos elementos graficos).

**Implementacao**: Reescrita de `apps/api/src/sales-sheets/services/art-composer.service.ts`

A composicao final sera montada no servidor usando Sharp (a instalar: `pnpm add sharp --filter=@multi-ai/api`) para sobrepor as camadas PNG em alta resolucao.

---

## 4. Layout Engine

### Problema atual
Templates sao grids de percentuais fixos. Toda lamina de um template sai identica.

### Solucao
Calcula posicoes dinamicamente com proporcao aurea, respiro visual, e adaptacao ao conteudo.

### Especificacao

**Principios de layout**:

- **Divisao principal (golden ratio)**: Area de imagem vs. area de texto usa razao 1.618. Se imagem a esquerda: 61.8% imagem, 38.2% texto. Variavel conforme tipo de produto.
- **Margens com escala modular**: Usa a mesma razao da tipografia. Se ratio = 1.25 e base margin = 16px: outer = 25px, section = 20px, inner = 16px, tight = 12.8px.
- **Area de respiro**: Cada elemento tem padding minimo proporcional ao seu tamanho. Headline (maior) tem mais respiro que caption (menor).
- **Peso visual**: Elementos maiores (imagem de produto) ficam em pontos de forca da composicao (intersecoes da regra dos tercos).

**Adaptacao ao conteudo**:
- Headline curta (1-3 palavras): zona headline compacta, mais espaco para imagem
- Headline longa (6-8 palavras): zona headline expandida, 2 linhas
- Poucos beneficios (2-3): espacamento generoso entre itens
- Muitos beneficios (5+): espacamento compacto, fonte menor
- CTA longo: botao mais largo
- CTA curto: botao compacto com mais padding lateral

**Variacoes de composicao** (mapa `LAYOUT_COMPOSITIONS`):
- `asymmetric-left`: imagem grande a esquerda, texto a direita
- `asymmetric-right`: imagem grande a direita, texto a esquerda
- `centered`: imagem centralizada no topo, texto abaixo
- `split-horizontal`: imagem no topo, texto na metade inferior
- `editorial`: imagem full-bleed com texto overlay com overlay escuro

**Interface de saida**:
```typescript
interface ComputedLayout {
  composition: string
  zones: Record<string, { x: number; y: number; width: number; height: number }> // valores em porcentagem
  margins: { outer: number; section: number; inner: number }
  contentAdaptations: {
    headlineLines: number
    benefitSpacing: 'generous' | 'normal' | 'compact'
    ctaWidth: 'compact' | 'normal' | 'wide'
  }
}
```

**Implementacao**: `apps/api/src/ai/layout/layout-engine.ts` (puro algoritmo, sem IA)

---

## 5. Export Studio

### Problema atual
PDF usa Helvetica hardcoded. PPTX usa texto em retangulos. Ambos parecem documentos corporativos genericos.

### Solucao
Exports que materializam fielmente o design gerado pelas camadas anteriores.

### Especificacao

**Dependencia: Google Fonts**:
As fontes do Visual System (Inter, Montserrat, Playfair Display, etc.) devem ser baixadas como arquivos .ttf e armazenadas em `apps/api/assets/fonts/`. PDFKit requer arquivos de fonte locais para `.registerFont()`. O PPTX referencia fontes por nome (requer instalacao no sistema de quem abre).

**PDF Principal (saida primaria)**:
- Fontes do Visual System embarcadas via PDFKit `.registerFont()` a partir dos .ttf locais
- Tamanhos de fonte da escala tipografica modular
- Background renderizado como gradiente real com PDFKit `.linearGradient()` / `.radialGradient()`
- Imagens de produto tratadas (fundo removido, sombra) embarcadas em alta resolucao
- Logo real do Brand Assets embarcada com area de protecao
- QR Code gerado e embarcado como imagem
- Sombra em texto: duplicar texto com offset de 1px em cor escura com opacidade baixa
- Overlay semitransparente em areas de texto sobre fundo complexo
- Resolucao: 300 DPI para impressao

**PNG de alta resolucao (saida complementar)**:
- Cada lamina/slide exportado tambem como PNG individual
- Resolucao: 2x (retina) — 1920x1080 para landscape, 1080x1920 para portrait
- Util para WhatsApp, email, redes sociais, catalogos digitais
- Gerado via Sharp a partir da composicao de camadas

**PPTX Simplificado (saida secundaria)**:
- Existe como opcao para quem precisa editar
- Usa as fontes do Visual System (nomes de fonte no PPTX, requer instalacao local)
- Layout simplificado: background como imagem (nao gradiente nativo), texto como objetos editaveis
- Nao tenta replicar efeitos avancados — e um "editavel funcional", nao a peca final

**Implementacao**: Reescrita de `apps/api/src/exports/services/pdf-composer.service.ts` e `pptx-composer.service.ts`. Novo servico `png-composer.service.ts` usando Sharp.

---

## 6. Design QA

### Problema atual
QA confere contagem de palavras e presenca de campos. Zero validacao visual.

### Solucao
Validacao automatica de qualidade visual com score e correcao automatica.

### Especificacao

**Checks visuais**:

| Check | Metrica | Threshold | Acao se falha |
|-------|---------|-----------|---------------|
| Contraste de texto | WCAG ratio (luminance) | >= 4.5:1 (AA) | Ajusta cor do texto ou adiciona overlay |
| Hierarquia tipografica | Cada nivel > nivel seguinte | Sem inversoes | Recalcula escala |
| Area de protecao do logo | Padding >= 1x altura do logo | Em todos os lados | Reposiciona elementos adjacentes |
| Legibilidade | Fonte minima | >= 8pt para impressao | Aumenta fonte, reduz conteudo |
| Sobreposicao | Intersecao de bounding boxes | 0% overlap entre zonas | Reposiciona via Layout Engine |
| Densidade visual | % do canvas ocupado por elementos | 40-75% | Ajusta margens |

**Funcao de contraste WCAG**:
```typescript
function contrastRatio(fg: string, bg: string): number {
  const lum1 = relativeLuminance(fg)
  const lum2 = relativeLuminance(bg)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}
```

**Score visual (0-100)**:
- Contraste: 25 pontos
- Hierarquia: 20 pontos
- Espacamento/respiro: 20 pontos
- Brand compliance: 15 pontos
- Legibilidade: 10 pontos
- Equilibrio: 10 pontos

**Pecas com score < 70**: sinalizadas ao usuario com sugestoes. Sistema tenta auto-corrigir e re-score. Se ainda < 70 apos correcao, mostra aviso mas permite uso.

**Implementacao**: `apps/api/src/ai/qa/design-qa.service.ts` (puro algoritmo, sem IA). Substituiu o QA textual atual.

---

## 7. Fluxo de Geracao Revisado

### Pipeline completo (sequencial):

```
Produto + Canal + Configuracao
        |
        v
  [1] Copy Director
        |  -> 3 variacoes de copy
        v
  [2] Visual System Generator
        |  -> paleta + tipografia + background + mood
        v
  [3] Layout Engine
        |  -> 3 composicoes de layout
        v
  [4] Art Composer Pro (3x em paralelo)
        |  -> 3 composicoes visuais completas
        v
  [5] Design QA (3x em paralelo)
        |  -> score + auto-correcao
        v
  [6] Apresentacao ao usuario
        |  -> 3 variacoes para escolha
        v
  [7] Usuario escolhe + ajustes finos opcionais
        v
  [8] Export Studio
        -> PDF (primario)
        -> PNG (complementar)
        -> PPTX (secundario, opcional)
```

### Combinacao de variacoes
- 3 copy variations x 3 layout compositions = 9 combinacoes possiveis
- O sistema seleciona as 3 melhores combinacoes (via Design QA score) para apresentar ao usuario
- Cada variacao tem copy + visual + layout distintos

### Tempo estimado de geracao
- Copy Director: ~3s
- Visual System: ~2s (IA) + <100ms (algoritmos)
- Layout Engine: <100ms (puro calculo)
- Art Composer: ~8-12s por variacao (3 em paralelo = ~12s total)
- Design QA: <500ms por variacao
- **Total: ~18-20 segundos para 3 variacoes completas**

### Feedback ao usuario
O componente GenerationProgress existente sera atualizado com os novos steps e estimativas de tempo por etapa.

---

## 8. Arquivos Novos e Modificados

### Novos:
- `apps/api/src/ai/agents/copy-director.agent.ts`
- `apps/api/src/ai/agents/visual-system.agent.ts`
- `apps/api/src/ai/utils/color-harmony.ts`
- `apps/api/src/ai/utils/type-scale.ts`
- `apps/api/src/ai/layout/layout-engine.ts`
- `apps/api/src/ai/qa/design-qa.service.ts`
- `apps/api/src/exports/services/png-composer.service.ts`

### Modificados (reescrita significativa):
- `apps/api/src/sales-sheets/sales-sheets.service.ts` — novo pipeline de geracao
- `apps/api/src/sales-sheets/services/art-composer.service.ts` — composicao por camadas
- `apps/api/src/exports/services/pdf-composer.service.ts` — export com fontes e efeitos
- `apps/api/src/exports/services/pptx-composer.service.ts` — export simplificado
- `apps/api/src/presentations/presentations.service.ts` — mesmo pipeline para decks
- `apps/api/src/ai/prompt-engine/prompt-engine.service.ts` — novos prompts cinematograficos

### Frontend (para suportar variacoes):
- `apps/web/app/sales-sheets/[id]/sales-sheet-detail-client.tsx` — UI de selecao de variacao
- `apps/web/components/canvas/sales-sheet-canvas.tsx` — renderiza visual system
- `apps/web/components/ui/generation-progress.tsx` — novos steps

---

## 9. Criterios de Sucesso

1. Uma lamina gerada para um mouse gamer deve parecer visivelmente diferente de uma gerada para um eletrodomestico — nao apenas na cor, mas no tom do texto, na tipografia, e na composicao
2. O PDF exportado deve ser indistinguivel de uma peca feita por um designer junior competente
3. 3 variacoes devem oferecer alternativas reais (nao 3 versoes quase identicas)
4. Score de Design QA medio >= 80 para pecas geradas
5. Tempo de geracao <= 25 segundos para 3 variacoes
6. O usuario deve conseguir escolher uma variacao e exportar sem ajustes em pelo menos 70% dos casos
