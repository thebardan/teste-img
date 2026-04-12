import { Injectable } from '@nestjs/common'
import PptxGenJS from 'pptxgenjs'

/** Attempt to download image URL and return as base64 data URI, or null on failure */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = res.headers.get('content-type') ?? 'image/png'
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch {
    return null
  }
}

export interface SlideContent {
  type: string
  title?: string
  subtitle?: string
  body?: string[]
  cta?: string | null
  logoUrl?: string | null
  visualDirection?: {
    colors?: string[]
    style?: string
  }
}

interface ZoneConfig {
  x: string | number
  y: string | number
  width: string | number
  height: string | number
}

// Convert percentage values to inches (based on 13.33 x 7.5 slide)
const SLIDE_W = 13.33
const SLIDE_H = 7.5

function pctToInches(val: string | number, total: number): number {
  if (typeof val === 'number') return (val / 100) * total
  if (val.endsWith('%')) return (parseFloat(val) / 100) * total
  return (parseFloat(val) / 100) * total
}

function resolveZone(zone: ZoneConfig) {
  return {
    x: pctToInches(zone.x, SLIDE_W),
    y: pctToInches(zone.y, SLIDE_H),
    w: pctToInches(zone.width, SLIDE_W),
    h: pctToInches(zone.height, SLIDE_H),
  }
}

// Strip '#' for PptxGenJS colors
function hexColor(color: string): string {
  return color.replace('#', '')
}

@Injectable()
export class PptxComposerService {
  async compose(
    title: string,
    slides: { order: number; content: SlideContent }[],
    zonesConfig?: Record<string, ZoneConfig>,
  ): Promise<Buffer> {
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 inches (16:9)
    pptx.title = title
    pptx.author = 'Multi AI Studio'

    const sorted = [...slides].sort((a, b) => a.order - b.order)

    for (const { content } of sorted) {
      const slide = pptx.addSlide()
      const colors = content.visualDirection?.colors ?? []
      const bgColor = colors[0] ? hexColor(colors[0]) : this.defaultBgColor(content.type)
      slide.background = { color: bgColor }

      if (zonesConfig) {
        await this.renderSlideWithZones(pptx, slide, content, zonesConfig, colors)
      } else {
        this.renderSlideDefault(pptx, slide, content, colors)
      }
    }

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    return buffer
  }

  /** Sales sheet as single-slide PPTX */
  async composeSalesSheet(
    content: Record<string, any>,
    productName: string,
    zonesConfig?: Record<string, ZoneConfig>,
    orientation: 'portrait' | 'landscape' = 'landscape',
  ): Promise<Buffer> {
    // Pre-fetch logo and product images
    const logoData = content.logoUrl ? await fetchImageAsBase64(content.logoUrl) : null
    const productImages: string[] = []
    const imageUrls: string[] = content.productImageUrls ?? (content.productImageUrl ? [content.productImageUrl] : [])
    for (const url of imageUrls.slice(0, 4)) {
      const data = await fetchImageAsBase64(url)
      if (data) productImages.push(data)
    }
    const pptx = new PptxGenJS()
    pptx.layout = 'LAYOUT_WIDE'
    pptx.title = productName
    pptx.author = 'Multi AI Studio'

    const slide = pptx.addSlide()
    const colors = content.visualDirection?.colors ?? ['#111827', '#1a2332']
    slide.background = { color: hexColor(colors[0] ?? '#111827') }

    if (zonesConfig) {
      for (const [zoneName, zone] of Object.entries(zonesConfig)) {
        const { x, y, w, h } = resolveZone(zone)

        switch (zoneName) {
          case 'headlineZone':
            if (content.headline) {
              slide.addText(content.headline, {
                x, y, w, h: h * 0.6,
                fontSize: 22, color: 'FFFFFF', bold: true, wrap: true,
              })
            }
            if (content.subtitle) {
              slide.addText(content.subtitle, {
                x, y: y + h * 0.65, w, h: h * 0.3,
                fontSize: 11, color: 'CCCCCC', wrap: true,
              })
            }
            break

          case 'benefitsZone':
            if (content.benefits?.length) {
              const bullets = content.benefits.map((b: string) => ({
                text: b,
                options: { bullet: { code: '25B8' }, color: 'FFFFFF', fontSize: 11 },
              }))
              slide.addText(bullets, { x, y, w, h, paraSpaceAfter: 4 })
            }
            break

          case 'ctaZone':
            if (content.cta) {
              const accentColor = colors[1] ? hexColor(colors[1]) : 'F59E0B'
              slide.addShape(pptx.ShapeType.roundRect, {
                x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h - 0.2,
                fill: { color: 'FFFFFF' },
                rectRadius: 0.08,
              })
              slide.addText(content.cta, {
                x, y, w, h,
                fontSize: 12, color: hexColor(colors[0] ?? '111827'), bold: true,
                align: 'center', valign: 'middle',
              })
            }
            break

          case 'logoZone':
            if (logoData) {
              slide.addImage({
                data: logoData,
                x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h - 0.2,
                sizing: { type: 'contain', w: w - 0.2, h: h - 0.2 },
              })
            } else {
              slide.addText('MULTILASER', {
                x, y, w, h,
                fontSize: 8, color: 'FFFFFF', bold: true, valign: 'middle',
                charSpacing: 2,
              })
            }
            break

          case 'qrZone':
            slide.addText('QR', {
              x, y, w, h,
              fontSize: 8, color: '999999', align: 'center', valign: 'middle',
            })
            break

          case 'imageZone':
            if (productImages.length > 0) {
              // Primary product image
              slide.addImage({
                data: productImages[0],
                x: x + 0.2, y: y + 0.2, w: w - 0.4, h: h - 0.4,
                sizing: { type: 'contain', w: w - 0.4, h: h - 0.4 },
              })
            } else {
              slide.addShape(pptx.ShapeType.roundRect, {
                x: x + 0.2, y: y + 0.2, w: w - 0.4, h: h - 0.4,
                fill: { color: 'FFFFFF', transparency: 95 },
                rectRadius: 0.1,
              })
              slide.addText(productName, {
                x, y, w, h,
                fontSize: 10, color: '888888', align: 'center', valign: 'middle',
              })
            }
            break

          default:
            break
        }
      }
    } else {
      // Fallback default layout
      if (logoData) {
        slide.addImage({
          data: logoData,
          x: 0.5, y: 0.2, w: 2, h: 0.5,
          sizing: { type: 'contain', w: 2, h: 0.5 },
        })
      } else {
        slide.addText('MULTILASER', {
          x: 0.5, y: 0.3, w: 3, h: 0.3,
          fontSize: 8, color: 'F59E0B', bold: true, charSpacing: 3,
        })
      }
      if (content.headline) {
        slide.addText(content.headline, {
          x: 0.5, y: 0.8, w: 12, h: 1.5,
          fontSize: 28, color: 'FFFFFF', bold: true, wrap: true,
        })
      }
      if (content.benefits?.length) {
        const bullets = content.benefits.map((b: string) => ({
          text: b,
          options: { bullet: { code: '25B8' }, color: 'FFFFFF', fontSize: 12 },
        }))
        slide.addText(bullets, { x: 0.5, y: 3, w: 12, h: 3.5, paraSpaceAfter: 6 })
      }
      if (content.cta) {
        slide.addShape(pptx.ShapeType.roundRect, {
          x: 0.5, y: 6.7, w: 4, h: 0.5,
          fill: { color: 'F59E0B' }, rectRadius: 0.06,
        })
        slide.addText(content.cta, {
          x: 0.5, y: 6.7, w: 4, h: 0.5,
          fontSize: 12, color: '111827', bold: true, align: 'center', valign: 'middle',
        })
      }
    }

    const buffer = (await pptx.write({ outputType: 'nodebuffer' })) as Buffer
    return buffer
  }

  private async renderSlideWithZones(
    pptx: PptxGenJS,
    slide: PptxGenJS.Slide,
    content: SlideContent,
    zones: Record<string, ZoneConfig>,
    colors: string[],
  ) {
    const accent = colors[1] ? hexColor(colors[1]) : 'F59E0B'
    const logoData = content.logoUrl ? await fetchImageAsBase64(content.logoUrl) : null

    for (const [zoneName, zone] of Object.entries(zones)) {
      const { x, y, w, h } = resolveZone(zone)

      switch (zoneName) {
        case 'titleZone':
          if (content.title) {
            slide.addText(content.title, {
              x, y, w, h,
              fontSize: content.type === 'cover' ? 36 : 28,
              color: 'F9FAFB', bold: true, wrap: true, valign: 'middle',
            })
          }
          break

        case 'taglineZone':
          if (content.subtitle) {
            slide.addText(content.subtitle, {
              x, y, w, h,
              fontSize: 14, color: accent, italic: true, valign: 'middle',
            })
          }
          break

        case 'bodyZone':
          if (content.body?.length) {
            const bullets = content.body.map((item) => ({
              text: item,
              options: { bullet: { type: 'number' as const }, color: 'F9FAFB', fontSize: 13 },
            }))
            slide.addText(bullets, { x, y, w, h, paraSpaceAfter: 6 })
          }
          break

        case 'heroZone':
        case 'fullBleedZone':
        case 'headerZone':
          // Background accent area
          slide.addShape(pptx.ShapeType.rect, {
            x, y, w, h,
            fill: { color: accent, transparency: 80 },
          })
          if (content.type === 'cover' && content.title) {
            slide.addText(content.title, {
              x: x + 0.3, y: y + 0.3, w: w - 0.6, h: h - 0.6,
              fontSize: 36, color: 'FFFFFF', bold: true, valign: 'bottom',
            })
          }
          break

        case 'logoZone':
          if (logoData) {
            slide.addImage({
              data: logoData,
              x: x + 0.1, y: y + 0.1, w: w - 0.2, h: h - 0.2,
              sizing: { type: 'contain', w: w - 0.2, h: h - 0.2 },
            })
          } else {
            slide.addText('MULTILASER', {
              x, y, w, h,
              fontSize: 8, color: '999999', bold: true, valign: 'middle', charSpacing: 2,
            })
          }
          break

        case 'footerZone':
          slide.addShape(pptx.ShapeType.rect, { x, y, w, h, fill: { color: '1F2937' } })
          slide.addText('Multilaser — Confidencial', {
            x, y, w, h,
            fontSize: 6, color: '6B7280', align: 'center', valign: 'middle',
          })
          break

        default:
          break
      }
    }
  }

  private renderSlideDefault(
    pptx: PptxGenJS,
    slide: PptxGenJS.Slide,
    content: SlideContent,
    colors: string[],
  ) {
    const accent = colors[1] ? hexColor(colors[1]) : 'F59E0B'

    // Accent bar top
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: '100%', h: 0.08,
      fill: { color: accent },
    })

    // Type label
    slide.addText(this.typeLabel(content.type).toUpperCase(), {
      x: 0.5, y: 0.25, w: 3, h: 0.3,
      fontSize: 7, color: '9CA3AF', bold: true, charSpacing: 2,
    })

    if (content.title) {
      slide.addText(content.title, {
        x: 0.5, y: 0.7, w: 12.3, h: 1.2,
        fontSize: content.type === 'cover' ? 36 : 28,
        color: 'F9FAFB', bold: true, wrap: true,
      })
    }

    if (content.subtitle) {
      slide.addText(content.subtitle, {
        x: 0.5, y: 2.1, w: 12.3, h: 0.5,
        fontSize: 14, color: accent, italic: content.type === 'cover',
      })
    }

    if (content.body?.length) {
      const bullets = content.body.map((item) => ({
        text: item,
        options: { bullet: { type: 'number' as const }, color: 'F9FAFB', fontSize: 13 },
      }))
      slide.addText(bullets, { x: 0.5, y: 2.7, w: 12.3, h: 4.0, paraSpaceAfter: 6 })
    }

    if (content.cta) {
      slide.addShape(pptx.ShapeType.roundRect, {
        x: 0.5, y: 6.7, w: 4, h: 0.55,
        fill: { color: accent }, rectRadius: 0.08,
      })
      slide.addText(content.cta, {
        x: 0.5, y: 6.7, w: 4, h: 0.55,
        fontSize: 12, color: '111827', bold: true, align: 'center', valign: 'middle',
      })
    }

    // Footer
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 7.35, w: '100%', h: 0.15,
      fill: { color: '1F2937' },
    })
    slide.addText('Multilaser — Confidencial', {
      x: 0, y: 7.35, w: '100%', h: 0.15,
      fontSize: 6, color: '6B7280', align: 'center', valign: 'middle',
    })
  }

  private typeLabel(type: string): string {
    const map: Record<string, string> = {
      cover: 'Capa',
      context: 'Contexto',
      products: 'Produtos',
      benefits: 'Beneficios',
      closing: 'Encerramento',
    }
    return map[type] ?? type
  }

  private defaultBgColor(type: string): string {
    const map: Record<string, string> = {
      cover: '111827',
      context: '1F2937',
      products: '111827',
      benefits: '1A2332',
      closing: '111827',
    }
    return map[type] ?? '111827'
  }
}
