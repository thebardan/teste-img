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
