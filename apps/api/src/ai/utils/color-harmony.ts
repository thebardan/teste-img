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

  const hsl = hexToHsl(textColor)

  // Try both directions and return whichever reaches the target first
  // Lighten
  for (let l = hsl.l; l <= 100; l += 1) {
    const candidate = hslToHex({ ...hsl, l })
    if (contrastRatio(candidate, bgColor) >= minRatio) return candidate
  }
  // Darken
  for (let l = hsl.l; l >= 0; l -= 1) {
    const candidate = hslToHex({ ...hsl, l })
    if (contrastRatio(candidate, bgColor) >= minRatio) return candidate
  }

  // Absolute fallback
  return contrastRatio('#ffffff', bgColor) >= minRatio ? '#ffffff' : '#000000'
}

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
