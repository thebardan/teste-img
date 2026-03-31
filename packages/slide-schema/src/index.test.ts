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
      SalesSheetContentSchema.parse({
        headline: 'X',
        benefits: [],
        cta: 'Y',
        productImageUrl: 'https://example.com/img.jpg',
        logoAssetId: 'l',
        qrUrl: 'https://example.com/qr',
        layout: { templateId: 't', zones: {} },
      })
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
      SlideContentSchema.parse({
        type: 'invalid',
        title: 'X',
        layout: { templateId: 't', zones: {} },
      })
    ).toThrow()
  })
})
