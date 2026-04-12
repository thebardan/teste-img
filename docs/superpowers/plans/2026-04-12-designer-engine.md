# Designer Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rewrite the Multi AI Studio creative pipeline so it produces designer-grade marketing materials with 3 variations per generation instead of generic template fills.

**Architecture:** Six subsystems form a sequential pipeline: Copy Director → Visual System Generator → Layout Engine → Art Composer Pro → Design QA → Export Studio. Pure-algorithm utilities (color harmony, type scale, layout math) are separated from AI-dependent agents. The generation flow produces 3 complete variations ranked by Design QA score.

**Tech Stack:** NestJS (API), Gemini 2.0 Flash (text AI), Sharp (image composition), PDFKit (PDF export), PptxGenJS (PPTX export), Google Fonts TTFs (typography).

---

### Task 1: Install Dependencies and Setup Font Assets

**Files:**
- Modify: `apps/api/package.json`
- Create: `apps/api/assets/fonts/.gitkeep`
- Create: `apps/api/scripts/download-fonts.sh`

- [ ] **Step 1: Install Sharp**

```bash
cd C:/Users/theba/Documents/Apps/teste-img && pnpm add sharp @types/sharp --filter=@multi-ai/api
```

Expected: sharp added to `apps/api/package.json` dependencies.

- [ ] **Step 2: Create fonts directory and download script**

Create `apps/api/scripts/download-fonts.sh`:
```bash
#!/bin/bash
# Downloads Google Fonts TTFs for PDF embedding
FONTS_DIR="$(dirname "$0")/../assets/fonts"
mkdir -p "$FONTS_DIR"

FONTS=(
  "https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf|Inter-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf|Montserrat-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf|PlayfairDisplay-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/oswald/Oswald%5Bwght%5D.ttf|Oswald-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-SemiBold.ttf|Poppins-SemiBold.ttf"
  "https://github.com/google/fonts/raw/main/ofl/poppins/Poppins-Regular.ttf|Poppins-Regular.ttf"
  "https://github.com/google/fonts/raw/main/ofl/nunito/Nunito%5Bwght%5D.ttf|Nunito-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/sourcesans3/SourceSans3%5Bwght%5D.ttf|SourceSans3-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/opensans/OpenSans%5Bwght%5D.ttf|OpenSans-Variable.ttf"
  "https://github.com/google/fonts/raw/main/ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf|DMSerifDisplay-Regular.ttf"
  "https://github.com/google/fonts/raw/main/ofl/dmsans/DMSans%5Bopsz%2Cwght%5D.ttf|DMSans-Variable.ttf"
)

for entry in "${FONTS[@]}"; do
  IFS='|' read -r url filename <<< "$entry"
  if [ ! -f "$FONTS_DIR/$filename" ]; then
    echo "Downloading $filename..."
    curl -sL "$url" -o "$FONTS_DIR/$filename"
  else
    echo "$filename already exists, skipping."
  fi
done

echo "Done. Fonts in $FONTS_DIR"
```

- [ ] **Step 3: Run the font download script**

```bash
cd C:/Users/theba/Documents/Apps/teste-img && bash apps/api/scripts/download-fonts.sh
```

Expected: TTF files downloaded to `apps/api/assets/fonts/`.

- [ ] **Step 4: Add .gitkeep and gitignore fonts (binary files)**

Create `apps/api/assets/fonts/.gitignore`:
```
*.ttf
!.gitignore
```

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json pnpm-lock.yaml apps/api/scripts/download-fonts.sh apps/api/assets/fonts/.gitignore
git commit -m "chore: add Sharp dependency and font download script"
```

---

### Task 2: Color Harmony Utility

**Files:**
- Create: `apps/api/src/ai/utils/color-harmony.ts`
- Create: `apps/api/src/ai/utils/color-harmony.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/ai/utils/color-harmony.spec.ts`:
```typescript
import {
  hexToHsl,
  hslToHex,
  generateHarmony,
  contrastRatio,
  relativeLuminance,
  ensureContrast,
} from './color-harmony'

describe('color-harmony', () => {
  describe('hexToHsl / hslToHex roundtrip', () => {
    it('converts #ff0000 to HSL and back', () => {
      const hsl = hexToHsl('#ff0000')
      expect(hsl.h).toBeCloseTo(0, 0)
      expect(hsl.s).toBeCloseTo(100, 0)
      expect(hsl.l).toBeCloseTo(50, 0)
      expect(hslToHex(hsl)).toBe('#ff0000')
    })

    it('converts #00ff00 correctly', () => {
      const hsl = hexToHsl('#00ff00')
      expect(hsl.h).toBeCloseTo(120, 0)
    })
  })

  describe('generateHarmony', () => {
    it('complementary returns color 180 degrees away', () => {
      const colors = generateHarmony(0, 'complementary')
      expect(colors).toHaveLength(2)
      // base hue 0 (red) => complementary at 180 (cyan)
      const second = hexToHsl(colors[1])
      expect(second.h).toBeCloseTo(180, 0)
    })

    it('analogous returns 2 colors 30 degrees apart', () => {
      const colors = generateHarmony(120, 'analogous')
      expect(colors).toHaveLength(3)
    })

    it('triadic returns 3 colors 120 degrees apart', () => {
      const colors = generateHarmony(0, 'triadic')
      expect(colors).toHaveLength(3)
      const hues = colors.map((c) => hexToHsl(c).h)
      expect(hues[1]).toBeCloseTo(120, 0)
      expect(hues[2]).toBeCloseTo(240, 0)
    })
  })

  describe('contrastRatio', () => {
    it('black on white is 21:1', () => {
      const ratio = contrastRatio('#000000', '#ffffff')
      expect(ratio).toBeCloseTo(21, 0)
    })

    it('same color is 1:1', () => {
      const ratio = contrastRatio('#888888', '#888888')
      expect(ratio).toBeCloseTo(1, 0)
    })
  })

  describe('ensureContrast', () => {
    it('returns original if contrast is sufficient', () => {
      const result = ensureContrast('#ffffff', '#000000', 4.5)
      expect(result).toBe('#ffffff')
    })

    it('adjusts text color when contrast is insufficient', () => {
      const result = ensureContrast('#777777', '#888888', 4.5)
      const ratio = contrastRatio(result, '#888888')
      expect(ratio).toBeGreaterThanOrEqual(4.5)
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest src/ai/utils/color-harmony.spec.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement color-harmony.ts**

Create `apps/api/src/ai/utils/color-harmony.ts`:
```typescript
export interface HSL {
  h: number // 0-360
  s: number // 0-100
  l: number // 0-100
}

export function hexToHsl(hex: string): HSL {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2

  if (max === min) return { h: 0, s: 0, l: l * 100 }

  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)

  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6

  return { h: h * 360, s: s * 100, l: l * 100 }
}

export function hslToHex({ h, s, l }: HSL): string {
  const s1 = s / 100
  const l1 = l / 100

  const c = (1 - Math.abs(2 * l1 - 1)) * s1
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l1 - c / 2

  let r = 0, g = 0, b = 0
  if (h < 60) { r = c; g = x }
  else if (h < 120) { r = x; g = c }
  else if (h < 180) { g = c; b = x }
  else if (h < 240) { g = x; b = c }
  else if (h < 300) { r = x; b = c }
  else { r = c; b = x }

  const toHex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`
}

export function generateHarmony(
  baseHue: number,
  scheme: 'complementary' | 'analogous' | 'triadic',
  saturation = 70,
  lightness = 50,
): string[] {
  const base = hslToHex({ h: baseHue, s: saturation, l: lightness })

  switch (scheme) {
    case 'complementary':
      return [base, hslToHex({ h: (baseHue + 180) % 360, s: saturation, l: lightness })]
    case 'analogous':
      return [
        hslToHex({ h: (baseHue + 330) % 360, s: saturation, l: lightness }),
        base,
        hslToHex({ h: (baseHue + 30) % 360, s: saturation, l: lightness }),
      ]
    case 'triadic':
      return [
        base,
        hslToHex({ h: (baseHue + 120) % 360, s: saturation, l: lightness }),
        hslToHex({ h: (baseHue + 240) % 360, s: saturation, l: lightness }),
      ]
  }
}

export function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b)
}

export function contrastRatio(fg: string, bg: string): number {
  const lum1 = relativeLuminance(fg)
  const lum2 = relativeLuminance(bg)
  const lighter = Math.max(lum1, lum2)
  const darker = Math.min(lum1, lum2)
  return (lighter + 0.05) / (darker + 0.05)
}

export function ensureContrast(textColor: string, bgColor: string, minRatio = 4.5): string {
  if (contrastRatio(textColor, bgColor) >= minRatio) return textColor

  const bgLum = relativeLuminance(bgColor)
  const hsl = hexToHsl(textColor)

  // Try lightening or darkening text to meet contrast
  if (bgLum < 0.5) {
    // Dark bg: lighten text
    for (let l = hsl.l; l <= 100; l += 2) {
      const candidate = hslToHex({ ...hsl, l })
      if (contrastRatio(candidate, bgColor) >= minRatio) return candidate
    }
    return '#ffffff'
  } else {
    // Light bg: darken text
    for (let l = hsl.l; l >= 0; l -= 2) {
      const candidate = hslToHex({ ...hsl, l })
      if (contrastRatio(candidate, bgColor) >= minRatio) return candidate
    }
    return '#000000'
  }
}

/** Build a full design palette from a base hue */
export function buildPalette(
  baseHue: number,
  scheme: 'complementary' | 'analogous' | 'triadic',
  darkMode: boolean,
) {
  const harmonyColors = generateHarmony(baseHue, scheme, 70, darkMode ? 55 : 50)

  const dominant = harmonyColors[0]
  const accent = harmonyColors[1] ?? harmonyColors[0]
  const background = darkMode
    ? hslToHex({ h: baseHue, s: 15, l: 8 })
    : hslToHex({ h: baseHue, s: 10, l: 96 })
  const backgroundSecondary = darkMode
    ? hslToHex({ h: baseHue, s: 12, l: 14 })
    : hslToHex({ h: baseHue, s: 8, l: 92 })
  const neutral = hslToHex({ h: baseHue, s: 5, l: darkMode ? 40 : 60 })
  const text = darkMode ? '#f5f5f7' : '#1d1d1f'
  const textSecondary = darkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.65)'

  return {
    dominant: ensureContrast(dominant, background),
    accent: ensureContrast(accent, background),
    neutral,
    background,
    backgroundSecondary,
    text: ensureContrast(text, background),
    textSecondary,
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest src/ai/utils/color-harmony.spec.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/utils/color-harmony.ts apps/api/src/ai/utils/color-harmony.spec.ts
git commit -m "feat: add color harmony utility with WCAG contrast validation"
```

---

### Task 3: Type Scale Utility

**Files:**
- Create: `apps/api/src/ai/utils/type-scale.ts`
- Create: `apps/api/src/ai/utils/type-scale.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/ai/utils/type-scale.spec.ts`:
```typescript
import { generateTypeScale, FONT_PAIRINGS, getFontPairing } from './type-scale'

describe('type-scale', () => {
  describe('generateTypeScale', () => {
    it('generates correct scale with Major Third (1.25)', () => {
      const scale = generateTypeScale(16, 1.25)
      expect(scale.body).toBe(16)
      expect(scale.headline).toBeCloseTo(16 * 1.25 ** 3, 1)
      expect(scale.caption).toBeCloseTo(16 / 1.25, 1)
    })

    it('hero is always the largest', () => {
      const scale = generateTypeScale(16, 1.2)
      expect(scale.hero).toBeGreaterThan(scale.headline)
      expect(scale.headline).toBeGreaterThan(scale.subtitle)
      expect(scale.subtitle).toBeGreaterThan(scale.body)
      expect(scale.body).toBeGreaterThan(scale.caption)
      expect(scale.caption).toBeGreaterThan(scale.micro)
    })
  })

  describe('getFontPairing', () => {
    it('returns tech pairing for gamer category', () => {
      const pair = getFontPairing('gamer')
      expect(pair.display).toBe('Montserrat')
      expect(pair.body).toBe('Inter')
    })

    it('returns corporate as default', () => {
      const pair = getFontPairing('unknown-category')
      expect(pair.display).toBe('Inter')
      expect(pair.body).toBe('Inter')
    })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest src/ai/utils/type-scale.spec.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement type-scale.ts**

Create `apps/api/src/ai/utils/type-scale.ts`:
```typescript
export interface TypeScale {
  hero: number
  headline: number
  subtitle: number
  body: number
  caption: number
  micro: number
}

export function generateTypeScale(baseSize: number, ratio: number): TypeScale {
  return {
    hero: Math.round(baseSize * ratio ** 4 * 10) / 10,
    headline: Math.round(baseSize * ratio ** 3 * 10) / 10,
    subtitle: Math.round(baseSize * ratio ** 2 * 10) / 10,
    body: baseSize,
    caption: Math.round((baseSize / ratio) * 10) / 10,
    micro: Math.round((baseSize / ratio ** 2) * 10) / 10,
  }
}

export interface FontPairing {
  display: string
  displayWeight: number
  body: string
  bodyWeight: number
}

export const FONT_PAIRINGS: Record<string, FontPairing> = {
  tech:        { display: 'Montserrat',       displayWeight: 700, body: 'Inter',          bodyWeight: 400 },
  premium:     { display: 'Playfair Display', displayWeight: 700, body: 'Source Sans 3',  bodyWeight: 400 },
  industrial:  { display: 'Oswald',           displayWeight: 700, body: 'Open Sans',      bodyWeight: 400 },
  lifestyle:   { display: 'Poppins',          displayWeight: 600, body: 'Nunito',         bodyWeight: 400 },
  corporate:   { display: 'Inter',            displayWeight: 700, body: 'Inter',          bodyWeight: 400 },
  editorial:   { display: 'DM Serif Display', displayWeight: 400, body: 'DM Sans',        bodyWeight: 400 },
}

const CATEGORY_PAIRING_MAP: Record<string, string> = {
  gamer: 'tech', gaming: 'tech', 'periféric': 'tech', mouse: 'tech', teclado: 'tech',
  áudio: 'tech', fone: 'tech', headphone: 'tech', speaker: 'tech',
  smartphone: 'premium', celular: 'premium', phone: 'premium',
  notebook: 'corporate', tablet: 'corporate', computador: 'corporate',
  câmera: 'editorial', segurança: 'editorial',
  fitness: 'tech', esporte: 'tech', smartwatch: 'tech',
  ferramenta: 'industrial', tool: 'industrial',
  cozinha: 'lifestyle', eletrodoméstico: 'lifestyle', eletroportát: 'lifestyle',
  'smart home': 'editorial',
}

export function getFontPairing(category: string): FontPairing {
  const cat = category.toLowerCase()
  for (const [keyword, pairingKey] of Object.entries(CATEGORY_PAIRING_MAP)) {
    if (cat.includes(keyword)) return FONT_PAIRINGS[pairingKey]
  }
  return FONT_PAIRINGS.corporate
}

/** Scale ratios by name for reference */
export const SCALE_RATIOS = {
  majorSecond: 1.125,
  minorThird: 1.2,
  majorThird: 1.25,
  perfectFourth: 1.333,
} as const
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest src/ai/utils/type-scale.spec.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/utils/type-scale.ts apps/api/src/ai/utils/type-scale.spec.ts
git commit -m "feat: add type scale and font pairing utilities"
```

---

### Task 4: Layout Engine

**Files:**
- Create: `apps/api/src/ai/layout/layout-engine.ts`
- Create: `apps/api/src/ai/layout/layout-engine.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/ai/layout/layout-engine.spec.ts`:
```typescript
import { LayoutEngine, type LayoutInput } from './layout-engine'

describe('LayoutEngine', () => {
  const defaultInput: LayoutInput = {
    headline: 'Domine cada frame',
    benefits: ['Sensor óptico', 'RGB', 'Ergonômico'],
    cta: 'Saiba mais',
    hasImage: true,
    hasLogo: true,
    hasQr: true,
    orientation: 'landscape',
  }

  it('returns 3 layout compositions', () => {
    const layouts = LayoutEngine.compute(defaultInput)
    expect(layouts).toHaveLength(3)
  })

  it('each layout has all required zones', () => {
    const layouts = LayoutEngine.compute(defaultInput)
    for (const layout of layouts) {
      expect(layout.zones.imageZone).toBeDefined()
      expect(layout.zones.headlineZone).toBeDefined()
      expect(layout.zones.benefitsZone).toBeDefined()
      expect(layout.zones.ctaZone).toBeDefined()
      expect(layout.zones.logoZone).toBeDefined()
    }
  })

  it('zones do not exceed 100% bounds', () => {
    const layouts = LayoutEngine.compute(defaultInput)
    for (const layout of layouts) {
      for (const zone of Object.values(layout.zones)) {
        expect(zone.x + zone.width).toBeLessThanOrEqual(100.1) // small float tolerance
        expect(zone.y + zone.height).toBeLessThanOrEqual(100.1)
      }
    }
  })

  it('adapts headline zone for long headlines', () => {
    const longInput = { ...defaultInput, headline: 'Este é um headline muito longo com muitas palavras' }
    const layouts = LayoutEngine.compute(longInput)
    expect(layouts[0].contentAdaptations.headlineLines).toBe(2)
  })

  it('adapts benefit spacing for many benefits', () => {
    const manyBenefits = { ...defaultInput, benefits: ['A', 'B', 'C', 'D', 'E', 'F'] }
    const layouts = LayoutEngine.compute(manyBenefits)
    expect(layouts[0].contentAdaptations.benefitSpacing).toBe('compact')
  })

  it('uses golden ratio for primary split', () => {
    const layouts = LayoutEngine.compute(defaultInput)
    const asym = layouts.find((l) => l.composition === 'asymmetric-left')
    if (asym) {
      // Image zone should be ~61.8% wide
      expect(asym.zones.imageZone.width).toBeCloseTo(61.8, 0)
    }
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest src/ai/layout/layout-engine.spec.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement layout-engine.ts**

Create `apps/api/src/ai/layout/layout-engine.ts`:
```typescript
const PHI = 1.618 // Golden ratio
const PHI_MINOR = 100 / PHI // ~61.8%
const PHI_MAJOR = 100 - PHI_MINOR // ~38.2%

export interface LayoutInput {
  headline: string
  benefits: string[]
  cta: string
  hasImage: boolean
  hasLogo: boolean
  hasQr: boolean
  hasSpecs?: boolean
  orientation: 'landscape' | 'portrait'
}

export interface ComputedLayout {
  composition: string
  zones: Record<string, { x: number; y: number; width: number; height: number }>
  margins: { outer: number; section: number; inner: number }
  contentAdaptations: {
    headlineLines: number
    benefitSpacing: 'generous' | 'normal' | 'compact'
    ctaWidth: 'compact' | 'normal' | 'wide'
  }
}

export class LayoutEngine {
  static compute(input: LayoutInput): ComputedLayout[] {
    const adaptations = this.analyzeContent(input)
    const margin = { outer: 4, section: 3, inner: 2 }

    if (input.orientation === 'landscape') {
      return [
        this.asymmetricLeft(input, adaptations, margin),
        this.asymmetricRight(input, adaptations, margin),
        this.editorial(input, adaptations, margin),
      ]
    }
    return [
      this.centeredVertical(input, adaptations, margin),
      this.splitHorizontal(input, adaptations, margin),
      this.editorial(input, adaptations, margin),
    ]
  }

  private static analyzeContent(input: LayoutInput) {
    const words = input.headline.split(/\s+/).length
    const headlineLines = words > 5 ? 2 : 1
    const benefitSpacing: 'generous' | 'normal' | 'compact' =
      input.benefits.length <= 3 ? 'generous' : input.benefits.length <= 5 ? 'normal' : 'compact'
    const ctaWords = input.cta.split(/\s+/).length
    const ctaWidth: 'compact' | 'normal' | 'wide' =
      ctaWords <= 2 ? 'compact' : ctaWords <= 4 ? 'normal' : 'wide'

    return { headlineLines, benefitSpacing, ctaWidth }
  }

  private static asymmetricLeft(
    input: LayoutInput,
    adaptations: ReturnType<typeof this.analyzeContent>,
    margin: ComputedLayout['margins'],
  ): ComputedLayout {
    const imgW = PHI_MINOR
    const textX = imgW + margin.section
    const textW = 100 - textX - margin.outer
    const headH = adaptations.headlineLines === 2 ? 22 : 16
    const benefitH = adaptations.benefitSpacing === 'compact' ? 35 : adaptations.benefitSpacing === 'normal' ? 30 : 25
    const logoH = 8
    const ctaH = 7

    const zones: ComputedLayout['zones'] = {
      imageZone: { x: 0, y: 0, width: imgW, height: 100 },
      headlineZone: { x: textX, y: margin.outer, width: textW, height: headH },
      benefitsZone: { x: textX, y: margin.outer + headH + margin.inner, width: textW, height: benefitH },
      ctaZone: { x: textX, y: 100 - margin.outer - ctaH, width: textW, height: ctaH },
      logoZone: { x: textX, y: 100 - margin.outer - ctaH - margin.inner - logoH, width: 18, height: logoH },
    }
    if (input.hasQr) {
      zones.qrZone = { x: textX + textW - 14, y: 100 - margin.outer - ctaH - margin.inner - logoH - 2, width: 14, height: logoH + 4 }
    }
    if (input.hasSpecs) {
      zones.specsZone = { x: textX, y: zones.benefitsZone.y + benefitH + margin.inner, width: textW, height: 18 }
    }

    return { composition: 'asymmetric-left', zones, margins: margin, contentAdaptations: adaptations }
  }

  private static asymmetricRight(
    input: LayoutInput,
    adaptations: ReturnType<typeof this.analyzeContent>,
    margin: ComputedLayout['margins'],
  ): ComputedLayout {
    const imgW = PHI_MINOR
    const textW = 100 - imgW - margin.section - margin.outer
    const headH = adaptations.headlineLines === 2 ? 22 : 16
    const benefitH = adaptations.benefitSpacing === 'compact' ? 35 : 30
    const logoH = 8
    const ctaH = 7

    const zones: ComputedLayout['zones'] = {
      imageZone: { x: 100 - imgW, y: 0, width: imgW, height: 100 },
      headlineZone: { x: margin.outer, y: margin.outer, width: textW, height: headH },
      benefitsZone: { x: margin.outer, y: margin.outer + headH + margin.inner, width: textW, height: benefitH },
      ctaZone: { x: margin.outer, y: 100 - margin.outer - ctaH, width: textW, height: ctaH },
      logoZone: { x: margin.outer, y: 100 - margin.outer - ctaH - margin.inner - logoH, width: 18, height: logoH },
    }
    if (input.hasQr) {
      zones.qrZone = { x: margin.outer + textW - 14, y: 100 - margin.outer - ctaH - margin.inner - logoH - 2, width: 14, height: logoH + 4 }
    }

    return { composition: 'asymmetric-right', zones, margins: margin, contentAdaptations: adaptations }
  }

  private static centeredVertical(
    input: LayoutInput,
    adaptations: ReturnType<typeof this.analyzeContent>,
    margin: ComputedLayout['margins'],
  ): ComputedLayout {
    const imgH = 48
    const headH = adaptations.headlineLines === 2 ? 14 : 10
    const benefitH = adaptations.benefitSpacing === 'compact' ? 20 : 16

    const zones: ComputedLayout['zones'] = {
      imageZone: { x: margin.outer, y: margin.outer, width: 100 - margin.outer * 2, height: imgH },
      headlineZone: { x: margin.outer, y: imgH + margin.section, width: 100 - margin.outer * 2, height: headH },
      benefitsZone: { x: margin.outer, y: imgH + margin.section + headH + margin.inner, width: 100 - margin.outer * 2, height: benefitH },
      ctaZone: { x: 20, y: 100 - margin.outer - 7, width: 60, height: 7 },
      logoZone: { x: margin.outer, y: 100 - margin.outer - 7, width: 16, height: 6 },
    }
    if (input.hasQr) {
      zones.qrZone = { x: 100 - margin.outer - 12, y: 100 - margin.outer - 10, width: 12, height: 10 }
    }

    return { composition: 'centered', zones, margins: margin, contentAdaptations: adaptations }
  }

  private static splitHorizontal(
    input: LayoutInput,
    adaptations: ReturnType<typeof this.analyzeContent>,
    margin: ComputedLayout['margins'],
  ): ComputedLayout {
    const splitY = 50

    const zones: ComputedLayout['zones'] = {
      imageZone: { x: 0, y: 0, width: 100, height: splitY },
      headlineZone: { x: margin.outer, y: splitY + margin.section, width: 100 - margin.outer * 2, height: 12 },
      benefitsZone: { x: margin.outer, y: splitY + margin.section + 14, width: 100 - margin.outer * 2, height: 22 },
      ctaZone: { x: 25, y: 100 - margin.outer - 7, width: 50, height: 7 },
      logoZone: { x: margin.outer, y: 100 - margin.outer - 6, width: 16, height: 5 },
    }
    if (input.hasQr) {
      zones.qrZone = { x: 100 - margin.outer - 12, y: 100 - margin.outer - 9, width: 12, height: 9 }
    }

    return { composition: 'split-horizontal', zones, margins: margin, contentAdaptations: adaptations }
  }

  private static editorial(
    input: LayoutInput,
    adaptations: ReturnType<typeof this.analyzeContent>,
    margin: ComputedLayout['margins'],
  ): ComputedLayout {
    // Full-bleed image with text overlay on dark overlay area
    const zones: ComputedLayout['zones'] = {
      imageZone: { x: 0, y: 0, width: 100, height: 100 },
      headlineZone: { x: margin.outer + 2, y: 50, width: 55, height: 16 },
      benefitsZone: { x: margin.outer + 2, y: 68, width: 50, height: 18 },
      ctaZone: { x: margin.outer + 2, y: 88, width: 30, height: 7 },
      logoZone: { x: margin.outer, y: margin.outer, width: 18, height: 7 },
    }
    if (input.hasQr) {
      zones.qrZone = { x: 100 - margin.outer - 12, y: 100 - margin.outer - 10, width: 12, height: 10 }
    }

    return { composition: 'editorial', zones, margins: margin, contentAdaptations: adaptations }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest src/ai/layout/layout-engine.spec.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/layout/layout-engine.ts apps/api/src/ai/layout/layout-engine.spec.ts
git commit -m "feat: add layout engine with golden ratio and content-adaptive zones"
```

---

### Task 5: Design QA Service

**Files:**
- Create: `apps/api/src/ai/qa/design-qa.service.ts`
- Create: `apps/api/src/ai/qa/design-qa.spec.ts`

- [ ] **Step 1: Write failing tests**

Create `apps/api/src/ai/qa/design-qa.spec.ts`:
```typescript
import { DesignQA, type DesignQAInput } from './design-qa.service'

describe('DesignQA', () => {
  const goodInput: DesignQAInput = {
    palette: {
      text: '#ffffff',
      textSecondary: '#cccccc',
      background: '#111111',
      dominant: '#0071e3',
      accent: '#ff6b00',
    },
    typography: {
      scale: { hero: 39, headline: 31, subtitle: 25, body: 20, caption: 16, micro: 12.8 },
    },
    zones: {
      headlineZone: { x: 62, y: 5, width: 35, height: 20 },
      benefitsZone: { x: 62, y: 30, width: 35, height: 35 },
      logoZone: { x: 62, y: 75, width: 15, height: 10 },
    },
    hasLogo: true,
    minFontSize: 8,
  }

  it('returns score >= 80 for well-designed input', () => {
    const result = DesignQA.evaluate(goodInput)
    expect(result.score).toBeGreaterThanOrEqual(80)
    expect(result.passed).toBe(true)
  })

  it('fails contrast check with similar colors', () => {
    const badInput = { ...goodInput, palette: { ...goodInput.palette, text: '#222222', background: '#111111' } }
    const result = DesignQA.evaluate(badInput)
    const contrastCheck = result.checks.find((c) => c.rule === 'contrast')
    expect(contrastCheck?.passed).toBe(false)
  })

  it('fails hierarchy check when sizes are inverted', () => {
    const badScale = { hero: 10, headline: 20, subtitle: 30, body: 20, caption: 16, micro: 12 }
    const badInput = { ...goodInput, typography: { scale: badScale } }
    const result = DesignQA.evaluate(badInput)
    const hierCheck = result.checks.find((c) => c.rule === 'hierarchy')
    expect(hierCheck?.passed).toBe(false)
  })

  it('returns suggestions for failing checks', () => {
    const badInput = { ...goodInput, palette: { ...goodInput.palette, text: '#333333', background: '#222222' } }
    const result = DesignQA.evaluate(badInput)
    expect(result.suggestions.length).toBeGreaterThan(0)
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest src/ai/qa/design-qa.spec.ts --no-coverage
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement design-qa.service.ts**

Create `apps/api/src/ai/qa/design-qa.service.ts`:
```typescript
import { contrastRatio } from '../utils/color-harmony'

export interface DesignQAInput {
  palette: {
    text: string
    textSecondary: string
    background: string
    dominant: string
    accent: string
  }
  typography: {
    scale: Record<string, number>
  }
  zones: Record<string, { x: number; y: number; width: number; height: number }>
  hasLogo: boolean
  minFontSize?: number
}

export interface DesignQACheck {
  rule: string
  category: 'contrast' | 'hierarchy' | 'spacing' | 'brand' | 'legibility' | 'balance'
  weight: number
  passed: boolean
  message: string
}

export interface DesignQAResult {
  score: number
  passed: boolean
  checks: DesignQACheck[]
  suggestions: string[]
}

export class DesignQA {
  static evaluate(input: DesignQAInput): DesignQAResult {
    const checks: DesignQACheck[] = [
      this.checkContrast(input),
      this.checkSecondaryContrast(input),
      this.checkHierarchy(input),
      this.checkOverlap(input),
      this.checkDensity(input),
      this.checkBrandPresence(input),
      this.checkMinFontSize(input),
    ]

    const totalWeight = checks.reduce((sum, c) => sum + c.weight, 0)
    const earnedWeight = checks.filter((c) => c.passed).reduce((sum, c) => sum + c.weight, 0)
    const score = Math.round((earnedWeight / totalWeight) * 100)

    const suggestions = checks
      .filter((c) => !c.passed)
      .map((c) => c.message)

    return {
      score,
      passed: score >= 70,
      checks,
      suggestions,
    }
  }

  private static checkContrast(input: DesignQAInput): DesignQACheck {
    const ratio = contrastRatio(input.palette.text, input.palette.background)
    return {
      rule: 'contrast',
      category: 'contrast',
      weight: 25,
      passed: ratio >= 4.5,
      message: `Contraste texto/fundo: ${ratio.toFixed(1)}:1 (mínimo 4.5:1). ${ratio < 4.5 ? 'Ajuste a cor do texto ou adicione overlay no fundo.' : ''}`,
    }
  }

  private static checkSecondaryContrast(input: DesignQAInput): DesignQACheck {
    const ratio = contrastRatio(input.palette.textSecondary, input.palette.background)
    return {
      rule: 'secondary-contrast',
      category: 'contrast',
      weight: 10,
      passed: ratio >= 3,
      message: `Contraste texto secundário/fundo: ${ratio.toFixed(1)}:1 (mínimo 3:1).`,
    }
  }

  private static checkHierarchy(input: DesignQAInput): DesignQACheck {
    const s = input.typography.scale
    const ordered = s.hero > s.headline && s.headline > s.subtitle && s.subtitle > s.body && s.body > s.caption
    return {
      rule: 'hierarchy',
      category: 'hierarchy',
      weight: 20,
      passed: ordered,
      message: ordered ? 'Hierarquia tipográfica correta.' : 'Hierarquia invertida — recalcule a escala modular.',
    }
  }

  private static checkOverlap(input: DesignQAInput): DesignQACheck {
    const zoneEntries = Object.entries(input.zones)
    let hasOverlap = false

    for (let i = 0; i < zoneEntries.length; i++) {
      for (let j = i + 1; j < zoneEntries.length; j++) {
        const [, a] = zoneEntries[i]
        const [, b] = zoneEntries[j]
        if (
          a.x < b.x + b.width && a.x + a.width > b.x &&
          a.y < b.y + b.height && a.y + a.height > b.y
        ) {
          hasOverlap = true
          break
        }
      }
      if (hasOverlap) break
    }

    return {
      rule: 'overlap',
      category: 'spacing',
      weight: 15,
      passed: !hasOverlap,
      message: hasOverlap ? 'Zonas sobrepostas detectadas — ajuste o layout.' : 'Sem sobreposição de zonas.',
    }
  }

  private static checkDensity(input: DesignQAInput): DesignQACheck {
    const totalArea = Object.values(input.zones).reduce((sum, z) => sum + z.width * z.height, 0)
    const canvasArea = 100 * 100
    const density = totalArea / canvasArea
    const ok = density >= 0.35 && density <= 0.80

    return {
      rule: 'density',
      category: 'balance',
      weight: 10,
      passed: ok,
      message: `Densidade visual: ${Math.round(density * 100)}% (ideal: 35-80%).`,
    }
  }

  private static checkBrandPresence(input: DesignQAInput): DesignQACheck {
    return {
      rule: 'brand',
      category: 'brand',
      weight: 10,
      passed: input.hasLogo && !!input.zones.logoZone,
      message: input.hasLogo ? 'Logo presente.' : 'Logo ausente — adicione via Brand Assets.',
    }
  }

  private static checkMinFontSize(input: DesignQAInput): DesignQACheck {
    const minSize = input.minFontSize ?? 8
    const tooSmall = Object.values(input.typography.scale).some((s) => s < minSize)
    return {
      rule: 'min-font',
      category: 'legibility',
      weight: 10,
      passed: !tooSmall,
      message: tooSmall ? `Fontes abaixo de ${minSize}pt detectadas.` : 'Tamanhos de fonte adequados.',
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest src/ai/qa/design-qa.spec.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add apps/api/src/ai/qa/design-qa.service.ts apps/api/src/ai/qa/design-qa.spec.ts
git commit -m "feat: add design QA with contrast, hierarchy, and layout validation"
```

---

### Task 6: Copy Director Agent

**Files:**
- Create: `apps/api/src/ai/agents/copy-director.agent.ts`

- [ ] **Step 1: Implement Copy Director**

Create `apps/api/src/ai/agents/copy-director.agent.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'

export interface CopyDirectorInput {
  productName: string
  sku: string
  category: string
  description: string
  benefits: string[]
  specs: string
  channel: string
}

export interface CopyVariation {
  approach: 'emotional' | 'rational' | 'aspirational'
  headline: string
  subtitle: string
  benefits: string[]
  cta: string
}

export interface CopyDirectorOutput {
  variations: CopyVariation[]
  selectedIndex: number
  toneProfile: {
    category: string
    channel: string
    voice: string
  }
}

const CATEGORY_TONE: Record<string, { tone: string; voice: string }> = {
  gamer:          { tone: 'agressivo, competitivo, verbos de ação', voice: 'Guerreiro digital' },
  periféric:      { tone: 'agressivo, competitivo, verbos de ação', voice: 'Guerreiro digital' },
  áudio:          { tone: 'imersivo, sensorial, foco em sensação', voice: 'Melômano exigente' },
  fone:           { tone: 'imersivo, sensorial, foco em sensação', voice: 'Melômano exigente' },
  smartphone:     { tone: 'aspiracional, moderno, lifestyle', voice: 'Early adopter' },
  celular:        { tone: 'aspiracional, moderno, lifestyle', voice: 'Early adopter' },
  notebook:       { tone: 'produtivo, performance, eficiência', voice: 'Profissional exigente' },
  computador:     { tone: 'produtivo, performance, eficiência', voice: 'Profissional exigente' },
  câmera:         { tone: 'aspiracional, experiência, memória', voice: 'Criador de conteúdo' },
  'smart home':   { tone: 'futurista, praticidade, inteligência', voice: 'Visionário conectado' },
  fitness:        { tone: 'energético, dinâmico, superação', voice: 'Atleta urbano' },
  esporte:        { tone: 'energético, dinâmico, superação', voice: 'Atleta urbano' },
  ferramenta:     { tone: 'robusto, confiável, durabilidade', voice: 'Profissional de obra' },
  cozinha:        { tone: 'acolhedor, rotina, conforto', voice: 'Chef de família' },
  eletrodoméstico:{ tone: 'acolhedor, rotina, conforto', voice: 'Chef de família' },
}

const CHANNEL_CTA: Record<string, string[]> = {
  Varejo:           ['Disponível na sua loja', 'Confira na prateleira', 'Peça já ao vendedor'],
  Distribuidor:     ['Solicite cotação', 'Fale com o representante', 'Consulte condições'],
  'Varejo Premium': ['Experiência exclusiva', 'Descubra mais', 'Conheça a linha completa'],
  'E-commerce':     ['Compre agora', 'Adicione ao carrinho', 'Aproveite o frete grátis'],
}

@Injectable()
export class CopyDirectorAgent {
  constructor(private promptEngine: PromptEngineService) {}

  async generate(input: CopyDirectorInput): Promise<CopyDirectorOutput> {
    const toneEntry = this.findTone(input.category)
    const channelCtas = CHANNEL_CTA[input.channel] ?? CHANNEL_CTA.Varejo

    const prompt = this.buildPrompt(input, toneEntry, channelCtas)

    const result = await this.promptEngine.run('copy-director', {
      prompt,
      productName: input.productName,
      category: input.category,
      channel: input.channel,
    })

    const parsed = result.parsedOutput as any

    const variations = this.parseVariations(parsed, input, channelCtas)

    return {
      variations,
      selectedIndex: 0,
      toneProfile: {
        category: input.category,
        channel: input.channel,
        voice: toneEntry.voice,
      },
    }
  }

  private findTone(category: string): { tone: string; voice: string } {
    const cat = category.toLowerCase()
    for (const [key, value] of Object.entries(CATEGORY_TONE)) {
      if (cat.includes(key)) return value
    }
    return { tone: 'profissional, claro, confiável', voice: 'Consumidor informado' }
  }

  private buildPrompt(
    input: CopyDirectorInput,
    tone: { tone: string; voice: string },
    channelCtas: string[],
  ): string {
    return `Você é um diretor de criação sênior especializado em materiais comerciais B2B e B2C.
Crie 3 VARIAÇÕES COMPLETAS de copy para a lâmina de vendas abaixo.

═══ PRODUTO ═══
Nome: ${input.productName} (SKU: ${input.sku})
Categoria: ${input.category}
Descrição: ${input.description}
Benefícios declarados: ${input.benefits.join(', ')}
Especificações: ${input.specs}

═══ CONTEXTO ═══
Canal: ${input.channel}
Tom de voz: ${tone.tone}
Persona: ${tone.voice}

═══ TÉCNICAS DE COPYWRITING ═══
- Use PAS (Problem/Agitation/Solution) para headlines — identifique a dor, amplifique, resolva
- Use Before/After para subtítulos — mostre a transformação
- Feature-to-Benefit para benefícios — não liste specs, liste o que o usuário GANHA
- CTA deve ser do universo do canal: ${channelCtas.join(', ')}

═══ 3 VARIAÇÕES ═══

VARIAÇÃO 1 — EMOCIONAL:
Foco em sentimento, conexão, desejo. Headline que provoca emoção.

VARIAÇÃO 2 — RACIONAL:
Foco em specs, números, comparação. Headline que convence com dados.

VARIAÇÃO 3 — ASPIRACIONAL:
Foco em lifestyle, status, futuro. Headline que inspira.

═══ REGRAS ═══
- Headline: 3–8 palavras, impactante
- Subtítulo: 8–15 palavras, complementar
- Benefícios: 3–5 itens, max 8 palavras cada, foco no ganho do usuário
- CTA: 2–5 palavras, ação clara
- Idioma: português brasileiro
- As 3 variações devem ser VISIVELMENTE DIFERENTES entre si

Responda APENAS com JSON:
{"variations": [{"approach": "emotional", "headline": "...", "subtitle": "...", "benefits": ["..."], "cta": "..."}, {"approach": "rational", ...}, {"approach": "aspirational", ...}]}`
  }

  private parseVariations(
    parsed: any,
    input: CopyDirectorInput,
    channelCtas: string[],
  ): CopyVariation[] {
    if (Array.isArray(parsed?.variations) && parsed.variations.length >= 3) {
      return parsed.variations.slice(0, 3).map((v: any, i: number) => ({
        approach: v.approach ?? (['emotional', 'rational', 'aspirational'] as const)[i],
        headline: v.headline ?? `${input.productName}`,
        subtitle: v.subtitle ?? input.description.slice(0, 80),
        benefits: Array.isArray(v.benefits) ? v.benefits.slice(0, 5) : input.benefits.slice(0, 4),
        cta: v.cta ?? channelCtas[0],
      }))
    }

    // Fallback: generate 3 basic variations from whatever we got
    const base = {
      headline: parsed?.headline ?? `${input.productName}`,
      subtitle: parsed?.subtitle ?? input.description.slice(0, 80),
      benefits: parsed?.benefits ?? input.benefits.slice(0, 4),
      cta: parsed?.cta ?? channelCtas[0],
    }

    return [
      { approach: 'emotional', ...base },
      { approach: 'rational', ...base, cta: channelCtas[1] ?? base.cta },
      { approach: 'aspirational', ...base, cta: channelCtas[2] ?? base.cta },
    ]
  }
}
```

- [ ] **Step 2: Add 'copy-director' prompt to PromptEngine inline prompts**

In `apps/api/src/ai/prompt-engine/prompt-engine.service.ts`, add to the `INLINE_PROMPTS` object:

```typescript
'copy-director': `{{prompt}}`,
```

This is a pass-through — the Copy Director builds its own rich prompt and passes it as the `prompt` variable.

- [ ] **Step 3: Verify API compiles**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai/agents/copy-director.agent.ts apps/api/src/ai/prompt-engine/prompt-engine.service.ts
git commit -m "feat: add Copy Director agent with tone profiles and 3 copy variations"
```

---

### Task 7: Visual System Agent

**Files:**
- Create: `apps/api/src/ai/agents/visual-system.agent.ts`

- [ ] **Step 1: Implement Visual System Agent**

Create `apps/api/src/ai/agents/visual-system.agent.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { PromptEngineService } from '../prompt-engine/prompt-engine.service'
import { hexToHsl, buildPalette } from '../utils/color-harmony'
import { generateTypeScale, getFontPairing, SCALE_RATIOS } from '../utils/type-scale'

export interface VisualSystemInput {
  productName: string
  category: string
  headline: string
  emotionalTone: string
  channel: string
}

export interface VisualSystem {
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
    angle: number
    overlay: { color: string; opacity: number }
    texture: 'none' | 'noise' | 'grid' | 'dots'
  }
  mood: {
    style: string
    emotionalTone: string
    darkMode: boolean
  }
}

@Injectable()
export class VisualSystemAgent {
  constructor(private promptEngine: PromptEngineService) {}

  async generate(input: VisualSystemInput): Promise<VisualSystem> {
    // Step 1: Ask AI for creative direction (dominant color, mood, style)
    const result = await this.promptEngine.run('visual-system', {
      productName: input.productName,
      category: input.category,
      headline: input.headline,
      emotionalTone: input.emotionalTone,
      channel: input.channel,
    })

    const aiOutput = result.parsedOutput as any

    // Step 2: Extract AI suggestions with sensible fallbacks
    const dominantHex = aiOutput?.dominantColor ?? '#0071e3'
    const darkMode = aiOutput?.darkMode ?? true
    const scheme = aiOutput?.colorScheme ?? 'analogous'
    const bgType = aiOutput?.backgroundType ?? 'gradient-linear'
    const bgAngle = aiOutput?.gradientAngle ?? 135
    const texture = aiOutput?.texture ?? 'none'
    const style = aiOutput?.style ?? 'modern tech'
    const emotionalTone = aiOutput?.emotionalTone ?? input.emotionalTone

    // Step 3: Algorithmically compute palette from AI-suggested base
    const baseHue = hexToHsl(dominantHex).h
    const palette = buildPalette(baseHue, scheme, darkMode)

    // Step 4: Compute typography from category
    const fontPairing = getFontPairing(input.category)
    const ratio = this.selectRatio(input.category)
    const scale = generateTypeScale(16, ratio)

    // Step 5: Build background
    const bgColors = darkMode
      ? [palette.background, palette.backgroundSecondary, palette.dominant]
      : [palette.background, palette.backgroundSecondary]

    const overlayOpacity = bgType === 'mesh' ? 0.6 : 0.3

    return {
      palette,
      typography: {
        displayFont: fontPairing.display,
        bodyFont: fontPairing.body,
        scale,
        ratio,
      },
      background: {
        type: bgType,
        colors: bgColors,
        angle: bgAngle,
        overlay: { color: darkMode ? '#000000' : '#ffffff', opacity: overlayOpacity },
        texture,
      },
      mood: {
        style,
        emotionalTone,
        darkMode,
      },
    }
  }

  private selectRatio(category: string): number {
    const cat = category.toLowerCase()
    if (cat.includes('gamer') || cat.includes('periféric')) return SCALE_RATIOS.perfectFourth
    if (cat.includes('premium') || cat.includes('smartphone')) return SCALE_RATIOS.majorThird
    if (cat.includes('ferramenta') || cat.includes('industrial')) return SCALE_RATIOS.majorSecond
    return SCALE_RATIOS.minorThird
  }
}
```

- [ ] **Step 2: Add 'visual-system' prompt to PromptEngine inline prompts**

In `apps/api/src/ai/prompt-engine/prompt-engine.service.ts`, add to the `INLINE_PROMPTS` object:

```typescript
'visual-system': `Você é um diretor de arte de uma agência criativa premiada.
Analise o produto abaixo e defina a DIREÇÃO CRIATIVA única para esta peça.

Produto: {{productName}}
Categoria: {{category}}
Headline: {{headline}}
Tom emocional: {{emotionalTone}}
Canal: {{channel}}

Sua tarefa NÃO é escolher entre opções pré-definidas.
Crie algo ORIGINAL baseado na essência do produto.

Decida:
1. Uma cor dominante (hex) que represente a alma do produto
2. Se o fundo deve ser escuro (darkMode: true) ou claro (darkMode: false)
3. Esquema de harmonia cromática: "complementary", "analogous", ou "triadic"
4. Tipo de fundo: "solid", "gradient-linear", "gradient-radial", ou "mesh"
5. Ângulo do gradiente (0-360, relevante se gradient)
6. Textura sutil: "none", "noise", "grid", ou "dots"
7. Estilo visual em uma frase (ex: "cyberpunk neon com toque industrial")
8. Tom emocional em duas palavras (ex: "poder silencioso")

Responda APENAS com JSON:
{"dominantColor": "#hex", "darkMode": true/false, "colorScheme": "analogous", "backgroundType": "gradient-linear", "gradientAngle": 135, "texture": "none", "style": "...", "emotionalTone": "..."}`,
```

- [ ] **Step 3: Verify API compiles**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/ai/agents/visual-system.agent.ts apps/api/src/ai/prompt-engine/prompt-engine.service.ts
git commit -m "feat: add Visual System agent with hybrid AI + algorithmic palette generation"
```

---

### Task 8: Update AI Module with New Agents

**Files:**
- Modify: `apps/api/src/ai/ai.module.ts`

- [ ] **Step 1: Register new agents and utilities**

Replace `apps/api/src/ai/ai.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { GeminiTextProvider } from './providers/gemini/gemini-text.provider'
import { GeminiImageProvider } from './providers/gemini/gemini-image.provider'
import { GeminiArtProvider } from './providers/gemini/gemini-art.provider'
import { PromptEngineService } from './prompt-engine/prompt-engine.service'
import { SalesCopywriterAgent } from './agents/sales-copywriter.agent'
import { CopyDirectorAgent } from './agents/copy-director.agent'
import { BrandGuardianAgent } from './agents/brand-guardian.agent'
import { VisualDirectorAgent } from './agents/visual-director.agent'
import { VisualSystemAgent } from './agents/visual-system.agent'
import { QAAgent } from './agents/qa.agent'
import { BrandAssetsModule } from '../brand-assets/brand-assets.module'

@Module({
  imports: [BrandAssetsModule],
  providers: [
    GeminiTextProvider,
    GeminiImageProvider,
    GeminiArtProvider,
    PromptEngineService,
    SalesCopywriterAgent,
    CopyDirectorAgent,
    BrandGuardianAgent,
    VisualDirectorAgent,
    VisualSystemAgent,
    QAAgent,
  ],
  exports: [
    GeminiTextProvider,
    GeminiImageProvider,
    GeminiArtProvider,
    PromptEngineService,
    SalesCopywriterAgent,
    CopyDirectorAgent,
    BrandGuardianAgent,
    VisualDirectorAgent,
    VisualSystemAgent,
    QAAgent,
  ],
})
export class AiModule {}
```

- [ ] **Step 2: Verify API compiles**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/ai/ai.module.ts
git commit -m "feat: register Copy Director and Visual System agents in AI module"
```

---

### Task 9: Rewrite Sales Sheet Generation Pipeline

**Files:**
- Modify: `apps/api/src/sales-sheets/sales-sheets.service.ts`

- [ ] **Step 1: Rewrite the generate method to use the new pipeline**

Replace the `generate` method in `apps/api/src/sales-sheets/sales-sheets.service.ts`. The new pipeline:
1. Loads product with all images
2. Runs Copy Director → 3 copy variations
3. Runs Visual System Generator → palette + typography + background
4. Runs Layout Engine → 3 layout compositions
5. Runs Brand Guardian → logo selection
6. Runs Design QA on each combination
7. Picks best 3 combinations by QA score
8. Saves all 3 as version content with `variations[]` array

Key changes to the service constructor — inject new agents:
```typescript
constructor(
  private prisma: PrismaClient,
  private copyDirector: CopyDirectorAgent,
  private brandGuardianAgent: BrandGuardianAgent,
  private visualSystemAgent: VisualSystemAgent,
) {}
```

The `generate` method builds a content object with:
```typescript
{
  variations: [
    {
      copy: { approach, headline, subtitle, benefits, cta },
      visualSystem: { palette, typography, background, mood },
      layout: { composition, zones, margins, contentAdaptations },
      qaScore: number,
    },
    // ... 2 more
  ],
  selectedVariation: 0,
  productImageUrls: string[],
  logoUrl: string,
  logoAssetId: string,
  qrUrl: string,
}
```

- [ ] **Step 2: Update the SalesSheets module to inject new dependencies**

Ensure `sales-sheets.module.ts` imports the new agents from `AiModule`.

- [ ] **Step 3: Verify API compiles**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/sales-sheets/sales-sheets.service.ts apps/api/src/sales-sheets/sales-sheets.module.ts
git commit -m "feat: rewrite sales sheet generation with Copy Director + Visual System + Layout Engine pipeline"
```

---

### Task 10: PNG Composer Service

**Files:**
- Create: `apps/api/src/exports/services/png-composer.service.ts`

- [ ] **Step 1: Implement PNG composer using Sharp**

Create `apps/api/src/exports/services/png-composer.service.ts`:
```typescript
import { Injectable, Logger } from '@nestjs/common'
import sharp from 'sharp'

export interface PngLayer {
  type: 'background' | 'image' | 'overlay'
  buffer: Buffer
  x: number
  y: number
  width: number
  height: number
}

@Injectable()
export class PngComposerService {
  private readonly logger = new Logger(PngComposerService.name)

  async compose(
    width: number,
    height: number,
    layers: PngLayer[],
  ): Promise<Buffer> {
    // Start with the first layer as base, or a transparent canvas
    let base = sharp({
      create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    }).png()

    const composites: sharp.OverlayOptions[] = []

    for (const layer of layers) {
      try {
        const resized = await sharp(layer.buffer)
          .resize(Math.round(layer.width), Math.round(layer.height), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
          .png()
          .toBuffer()

        composites.push({
          input: resized,
          left: Math.round(layer.x),
          top: Math.round(layer.y),
        })
      } catch (err) {
        this.logger.warn(`Failed to composite layer: ${err}`)
      }
    }

    if (composites.length > 0) {
      base = base.composite(composites)
    }

    return base.toBuffer()
  }

  async createGradientBackground(
    width: number,
    height: number,
    colors: string[],
    angle = 135,
  ): Promise<Buffer> {
    // Create gradient using SVG
    const radian = (angle * Math.PI) / 180
    const x2 = Math.round(Math.cos(radian) * 100)
    const y2 = Math.round(Math.sin(radian) * 100)

    const stops = colors
      .map((c, i) => `<stop offset="${(i / (colors.length - 1)) * 100}%" stop-color="${c}"/>`)
      .join('')

    const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="${x2}%" y2="${y2}%">
          ${stops}
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g)"/>
    </svg>`

    return sharp(Buffer.from(svg)).png().toBuffer()
  }
}
```

- [ ] **Step 2: Register in exports module**

Add `PngComposerService` to `apps/api/src/exports/exports.module.ts` providers and exports.

- [ ] **Step 3: Verify API compiles**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/api/src/exports/services/png-composer.service.ts apps/api/src/exports/exports.module.ts
git commit -m "feat: add PNG composer service using Sharp for layer-based image composition"
```

---

### Task 11: Update Frontend — Variation Selector UI

**Files:**
- Modify: `apps/web/app/sales-sheets/[id]/sales-sheet-detail-client.tsx`
- Modify: `apps/web/components/ui/generation-progress.tsx`

- [ ] **Step 1: Add variation selector component to sales sheet detail**

Add a `VariationSelector` component that shows 3 thumbnail previews of each variation with their QA scores. The user clicks one to select it as the active variation. The selected variation's copy/visual/layout feeds the existing SalesSheetCanvas and export panels.

Key UI elements:
- 3 cards side by side, each showing: mini canvas preview, headline text, approach badge (Emocional/Racional/Aspiracional), QA score badge
- Selected card has accent ring
- Clicking updates `content.selectedVariation` via the existing `useUpdateSalesSheetContent` hook

- [ ] **Step 2: Update GenerationProgress with new pipeline steps**

Update `SALES_SHEET_STEPS` in `apps/web/components/ui/generation-progress.tsx`:
```typescript
const SALES_SHEET_STEPS: GenerationStep[] = [
  { id: 'copy', label: 'Criando 3 variações de copy...', icon: Sparkles },
  { id: 'visual', label: 'Gerando sistema visual único...', icon: Palette },
  { id: 'layout', label: 'Calculando composições de layout...', icon: Layout },
  { id: 'logo', label: 'Selecionando logo ideal...', icon: Shield },
  { id: 'qa', label: 'Validando qualidade visual...', icon: CheckCircle2 },
  { id: 'save', label: 'Salvando 3 variações...', icon: FileCheck },
]
```

- [ ] **Step 3: Verify web builds**

```bash
cd C:/Users/theba/Documents/Apps/teste-img && npx turbo build --filter=@multi-ai/web --force
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add apps/web/app/sales-sheets/[id]/sales-sheet-detail-client.tsx apps/web/components/ui/generation-progress.tsx
git commit -m "feat: add variation selector UI and updated generation progress steps"
```

---

### Task 12: Rewrite PDF Export with Visual System

**Files:**
- Modify: `apps/api/src/exports/services/pdf-composer.service.ts`

- [ ] **Step 1: Update PDF composer to use Visual System data**

Key changes:
- Register fonts from `apps/api/assets/fonts/` using `doc.registerFont(name, path)`
- Use `VisualSystem.typography.scale` for font sizes instead of hardcoded values
- Use `VisualSystem.palette` for all colors instead of hardcoded hex
- Render background gradients using PDFKit's `.linearGradient()` 
- Apply text shadow by drawing text twice (dark offset then white)
- Apply overlay rectangles with opacity for text legibility on complex backgrounds
- Embed real product images and logo images (already implemented, refine positioning)

Font registration helper:
```typescript
private registerFonts(doc: PDFKit.PDFDocument, displayFont: string, bodyFont: string) {
  const fontsDir = path.join(__dirname, '../../../assets/fonts')
  const fontMap: Record<string, string> = {
    'Inter': 'Inter-Variable.ttf',
    'Montserrat': 'Montserrat-Variable.ttf',
    'Playfair Display': 'PlayfairDisplay-Variable.ttf',
    'Oswald': 'Oswald-Variable.ttf',
    'Poppins': 'Poppins-SemiBold.ttf',
    'Nunito': 'Nunito-Variable.ttf',
    'Source Sans 3': 'SourceSans3-Variable.ttf',
    'Open Sans': 'OpenSans-Variable.ttf',
    'DM Serif Display': 'DMSerifDisplay-Regular.ttf',
    'DM Sans': 'DMSans-Variable.ttf',
  }
  for (const [name, file] of Object.entries(fontMap)) {
    const fontPath = path.join(fontsDir, file)
    if (fs.existsSync(fontPath)) {
      doc.registerFont(name, fontPath)
    }
  }
}
```

- [ ] **Step 2: Verify API compiles**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/exports/services/pdf-composer.service.ts
git commit -m "feat: rewrite PDF export with Visual System fonts, palette, and gradients"
```

---

### Task 13: Integration — Wire Everything Together

**Files:**
- Modify: `apps/api/src/sales-sheets/sales-sheets.service.ts` (final wiring)
- Modify: `apps/api/src/exports/exports.service.ts` (use selected variation)

- [ ] **Step 1: Ensure the exports service reads the selected variation**

In `exports.service.ts`, when exporting a sales sheet, read `content.selectedVariation` index to pick which variation's copy/visual/layout to use for the export.

- [ ] **Step 2: Run full API type check**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Build frontend**

```bash
cd C:/Users/theba/Documents/Apps/teste-img && npx turbo build --filter=@multi-ai/web --force
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: wire Designer Engine pipeline end-to-end — generation to export"
```

---

### Task 14: Run All Tests

- [ ] **Step 1: Run all unit tests**

```bash
cd C:/Users/theba/Documents/Apps/teste-img/apps/api && npx jest --no-coverage
```

Expected: All tests pass. Fix any failures.

- [ ] **Step 2: Full build verification**

```bash
cd C:/Users/theba/Documents/Apps/teste-img && npx turbo build --force
```

Expected: Both API and web build successfully.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "test: verify Designer Engine pipeline — all tests passing"
```
