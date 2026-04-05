import { Injectable } from '@nestjs/common'
import PptxGenJS from 'pptxgenjs'

export interface SlideContent {
  type: string
  title?: string
  subtitle?: string
  body?: string[]
  cta?: string | null
  logoUrl?: string | null
}

const SLIDE_BG_COLORS: Record<string, string> = {
  cover:    '111827',
  context:  '1F2937',
  products: '111827',
  benefits: '1A2332',
  closing:  '111827',
}

const BRAND_ACCENT = 'F59E0B'
const TEXT_PRIMARY = 'F9FAFB'
const TEXT_MUTED   = '9CA3AF'

@Injectable()
export class PptxComposerService {
  async compose(
    title: string,
    slides: { order: number; content: SlideContent }[],
  ): Promise<Buffer> {
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'   // 13.33 × 7.5 inches (16:9)
    pptx.title  = title
    pptx.author = 'Multi AI Studio'

    const sorted = [...slides].sort((a, b) => a.order - b.order)

    for (const { content } of sorted) {
      const slide = pptx.addSlide()
      const bg = SLIDE_BG_COLORS[content.type] ?? '111827'
      slide.background = { color: bg }

      // Accent bar top
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 0, w: '100%', h: 0.08,
        fill: { color: BRAND_ACCENT },
        line:  { color: BRAND_ACCENT },
      })

      // Slide type label (top-left)
      slide.addText(this.typeLabel(content.type).toUpperCase(), {
        x: 0.5, y: 0.25, w: 3, h: 0.3,
        fontSize: 7, color: TEXT_MUTED, bold: true, charSpacing: 2,
      })

      // Title
      if (content.title) {
        slide.addText(content.title, {
          x: 0.5, y: 0.7, w: 12.3, h: 1.2,
          fontSize: content.type === 'cover' ? 36 : 28,
          color: TEXT_PRIMARY,
          bold: true,
          wrap: true,
        })
      }

      // Subtitle
      if (content.subtitle) {
        slide.addText(content.subtitle, {
          x: 0.5, y: 2.1, w: 12.3, h: 0.5,
          fontSize: 14, color: BRAND_ACCENT, italic: content.type === 'cover',
        })
      }

      // Body bullets
      if (content.body?.length) {
        const bullets = content.body.map((item) => ({
          text: item,
          options: { bullet: { type: 'number' as const }, color: TEXT_PRIMARY, fontSize: 13 },
        }))
        slide.addText(bullets, {
          x: 0.5, y: 2.7, w: 12.3, h: 4.0,
          paraSpaceAfter: 6,
        })
      }

      // CTA pill
      if (content.cta) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y: 6.7, w: 4, h: 0.55,
          fill: { color: BRAND_ACCENT },
          line: { color: BRAND_ACCENT },
          rectRadius: 0.08,
        })
        slide.addText(content.cta, {
          x: 0.5, y: 6.7, w: 4, h: 0.55,
          fontSize: 12, color: '111827', bold: true, align: 'center', valign: 'middle',
        })
      }

      // Footer bar
      slide.addShape(pptx.ShapeType.rect, {
        x: 0, y: 7.35, w: '100%', h: 0.15,
        fill: { color: '1F2937' },
        line:  { color: '1F2937' },
      })
      slide.addText('Multilaser — Confidencial', {
        x: 0, y: 7.35, w: '100%', h: 0.15,
        fontSize: 6, color: '6B7280', align: 'center', valign: 'middle',
      })
    }

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    return buffer
  }

  private typeLabel(type: string): string {
    const map: Record<string, string> = {
      cover:    'Capa',
      context:  'Contexto',
      products: 'Produtos',
      benefits: 'Benefícios',
      closing:  'Encerramento',
    }
    return map[type] ?? type
  }
}
