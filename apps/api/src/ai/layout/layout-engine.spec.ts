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
        expect(zone.x + zone.width).toBeLessThanOrEqual(100.1)
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
      expect(asym.zones.imageZone.width).toBeCloseTo(61.8, 0)
    }
  })
})
