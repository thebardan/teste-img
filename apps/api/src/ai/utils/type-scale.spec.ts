import { generateTypeScale, FONT_PAIRINGS, getFontPairing } from './type-scale'

describe('type-scale', () => {
  describe('generateTypeScale', () => {
    it('generates correct scale with Major Third (1.25)', () => {
      const scale = generateTypeScale(16, 1.25)
      expect(scale.body).toBe(16)
      expect(scale.headline).toBeCloseTo(16 * 1.25 ** 3, 0)
      expect(scale.caption).toBeCloseTo(16 / 1.25, 0)
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
