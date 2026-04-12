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
      const second = hexToHsl(colors[1])
      expect(second.h).toBeCloseTo(180, 0)
    })

    it('analogous returns 3 colors', () => {
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
