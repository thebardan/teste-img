import { Injectable } from '@nestjs/common'
import * as PDFDocument from 'pdfkit'
import * as path from 'path'
import * as fs from 'fs'
import type { SlideContent } from './pptx-composer.service'
import { QrCodeService } from './qrcode.service'

/** Attempt to download image URL and return as Buffer, or null on failure */
async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return Buffer.from(await res.arrayBuffer())
  } catch {
    return null
  }
}

// A4 landscape: 841.89 x 595.28 pt  (pdfkit default pt unit)
const W = 841.89
const H = 595.28

// Sales sheet portrait: 595.28 x 841.89 pt
const SS_W = 595.28
const SS_H = 841.89

// Sales sheet landscape
const SSL_W = 841.89
const SSL_H = 595.28

interface ZoneConfig {
  x: string | number
  y: string | number
  width: string | number
  height: string | number
}

function pct(val: string | number): number {
  if (typeof val === 'number') return val / 100
  if (val.endsWith('%')) return parseFloat(val) / 100
  return parseFloat(val) / 100
}

function resolveZone(zone: ZoneConfig, canvasW: number, canvasH: number) {
  return {
    x: pct(zone.x) * canvasW,
    y: pct(zone.y) * canvasH,
    w: pct(zone.width) * canvasW,
    h: pct(zone.height) * canvasH,
  }
}

@Injectable()
export class PdfComposerService {
  constructor(private qrCode: QrCodeService) {}

  /** PDF with one page per slide (16:9 A4 landscape) */
  async composePresentation(
    title: string,
    slides: { order: number; content: SlideContent }[],
    zonesConfig?: Record<string, ZoneConfig>,
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))

    const sorted = [...slides].sort((a, b) => a.order - b.order)
    let first = true

    for (const { content } of sorted) {
      if (!first) doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
      first = false

      // Background - use visual direction colors if available
      const bgColor = content.visualDirection?.colors?.[0] ?? '#111827'
      doc.rect(0, 0, W, H).fill(bgColor)

      // If we have zonesConfig, use it for positioning
      if (zonesConfig) {
        this.renderSlideWithZones(doc, content, zonesConfig, W, H)
      } else {
        this.renderSlideDefault(doc, content, W, H)
      }

      // Footer bar
      doc.rect(0, H - 18, W, 18).fill('#1F2937')
      doc.fillColor('#9CA3AF').fontSize(7).font('Helvetica')
         .text('Multilaser — Confidencial', 0, H - 12, { width: W, align: 'center' })
    }

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      doc.end()
    })
  }

  /** PDF for a single sales sheet — uses Gemini art if available, otherwise composes layout */
  async composeSalesSheet(
    content: Record<string, any>,
    productName: string,
    zonesConfig?: Record<string, ZoneConfig>,
    orientation: 'portrait' | 'landscape' = 'portrait',
    artImageBuffer?: Buffer | null,
    visualSystem?: { palette: any; typography: any; background: any } | null,
  ): Promise<Buffer> {
    const isLandscape = orientation === 'landscape'
    const pageW = isLandscape ? SSL_W : SS_W
    const pageH = isLandscape ? SSL_H : SS_H

    const doc = new PDFDocument({
      size: 'A4',
      layout: isLandscape ? 'landscape' : 'portrait',
      margin: 0,
    })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))

    this.registerFonts(doc)

    // If we have the Gemini-generated art, use it as full-page image
    if (artImageBuffer) {
      try {
        doc.image(artImageBuffer, 0, 0, { width: pageW, height: pageH })
      } catch {
        // If image fails (corrupt/unsupported), fall back to composed layout
        await this.renderFallback(doc, content, productName, zonesConfig, pageW, pageH, visualSystem)
      }
    } else {
      await this.renderFallback(doc, content, productName, zonesConfig, pageW, pageH, visualSystem)
    }

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      doc.end()
    })
  }

  private async renderFallback(
    doc: PDFKit.PDFDocument,
    content: Record<string, any>,
    productName: string,
    zonesConfig: Record<string, ZoneConfig> | undefined,
    pageW: number,
    pageH: number,
    visualSystem?: { palette: any; typography: any; background: any } | null,
  ) {
    if (visualSystem?.background?.colors?.length) {
      // Render gradient background using visualSystem colors
      const bgColors: string[] = visualSystem.background.colors
      doc.rect(0, 0, pageW, pageH).fill(bgColors[0])
      if (bgColors.length > 1) {
        // Approximate gradient with a second rect covering the right portion
        doc.save()
        doc.rect(pageW * 0.4, 0, pageW * 0.6, pageH).fill(bgColors[bgColors.length - 1])
        doc.restore()
      }
    } else {
      const colors = content.visualDirection?.colors ?? ['#111827', '#1a2332']
      doc.rect(0, 0, pageW, pageH).fill(colors[0])
      if (colors[1]) {
        doc.save()
        doc.rect(pageW * 0.4, 0, pageW * 0.6, pageH).fill(colors[1])
        doc.restore()
      }
    }
    if (zonesConfig) {
      await this.renderSalesSheetWithZones(doc, content, productName, zonesConfig, pageW, pageH, visualSystem)
    } else {
      await this.renderSalesSheetDefault(doc, content, productName, pageW, pageH, visualSystem)
    }
  }

  // ─── Zone-based rendering ──────────────────────────────────────────────────

  private async renderSalesSheetWithZones(
    doc: PDFKit.PDFDocument,
    content: Record<string, any>,
    productName: string,
    zones: Record<string, ZoneConfig>,
    pageW: number,
    pageH: number,
    visualSystem?: { palette: any; typography: any; background: any } | null,
  ) {
    const displayFont = this.resolveFont(visualSystem?.typography?.displayFont) ?? 'Helvetica-Bold'
    const bodyFont = this.resolveFont(visualSystem?.typography?.bodyFont) ?? 'Helvetica'
    const textColor = visualSystem?.palette?.text ?? '#FFFFFF'
    const mutedColor = visualSystem?.palette?.muted ?? '#D0D0D0'
    const accentColor = visualSystem?.palette?.accent ?? '#FFFFFF'
    const bgColor = visualSystem?.palette?.background ?? '#111827'
    const headlineSize = visualSystem?.typography?.scale?.headline ?? 22
    const bodySize = visualSystem?.typography?.scale?.body ?? 11
    const labelSize = visualSystem?.typography?.scale?.label ?? 7
    // Pre-fetch logo and product images
    const logoBuffer = content.logoUrl ? await fetchImageBuffer(content.logoUrl) : null
    const productImages: Buffer[] = []
    const imageUrls: string[] = content.productImageUrls ?? (content.productImageUrl ? [content.productImageUrl] : [])
    for (const url of imageUrls.slice(0, 4)) {
      const buf = await fetchImageBuffer(url)
      if (buf) productImages.push(buf)
    }

    for (const [zoneName, zone] of Object.entries(zones)) {
      const { x, y, w, h } = resolveZone(zone, pageW, pageH)

      switch (zoneName) {
        case 'headlineZone':
          if (content.headline) {
            this.drawTextWithShadow(doc, content.headline, x + 8, y + 8, {
              font: displayFont,
              fontSize: headlineSize,
              color: textColor,
              width: w - 16,
              lineGap: 3,
            })
          }
          if (content.subtitle) {
            doc.fillColor(mutedColor).fontSize(bodySize).font(bodyFont)
               .text(content.subtitle, x + 8, doc.y + 6, { width: w - 16 })
          }
          break

        case 'benefitsZone':
          doc.fillColor(mutedColor).fontSize(labelSize).font(displayFont)
             .text('BENEFICIOS', x + 8, y + 6, { characterSpacing: 1.5 })
          if (content.benefits?.length) {
            doc.fillColor(textColor).fontSize(bodySize).font(bodyFont)
            for (const b of content.benefits) {
              doc.text(`▸  ${b}`, x + 8, doc.y + 6, { width: w - 16, lineGap: 2 })
            }
          }
          break

        case 'ctaZone':
          if (content.cta) {
            const ctaW = Math.min(w - 16, 200)
            const ctaX = x + (w - ctaW) / 2
            doc.roundedRect(ctaX, y + (h - 28) / 2, ctaW, 28, 6).fill(accentColor)
            doc.fillColor(bgColor).fontSize(bodySize).font(displayFont)
               .text(content.cta, ctaX, y + (h - 28) / 2 + 8, { width: ctaW, align: 'center' })
          }
          break

        case 'logoZone':
          if (logoBuffer) {
            try {
              const logoSize = Math.min(w - 8, h - 4)
              doc.image(logoBuffer, x + 4, y + (h - logoSize * 0.6) / 2, {
                fit: [w - 8, h - 4],
              })
            } catch {
              doc.fillColor(textColor).fontSize(8).font(displayFont)
                 .text('MULTILASER', x + 8, y + (h - 8) / 2, { width: w - 8 })
            }
          } else {
            doc.save()
            doc.roundedRect(x + 4, y + (h - 24) / 2, 60, 24, 4).fill('rgba(255,255,255,0.15)')
            doc.fillColor(textColor).fontSize(8).font(displayFont)
               .text('MULTILASER', x + 8, y + (h - 8) / 2, { width: w - 8 })
            doc.restore()
          }
          break

        case 'qrZone':
          if (content.qrUrl) {
            try {
              const qrBuf = await this.qrCode.toBuffer(content.qrUrl, 120)
              const qrSize = Math.min(w - 8, h - 8, 100)
              doc.image(qrBuf, x + (w - qrSize) / 2, y + (h - qrSize) / 2, { width: qrSize, height: qrSize })
            } catch {
              doc.fillColor('#666666').fontSize(7).text('QR', x + 4, y + 4)
            }
          }
          break

        case 'imageZone':
          if (productImages.length > 0) {
            try {
              doc.image(productImages[0], x + 8, y + 8, {
                fit: [w - 16, h - 16],
                align: 'center',
                valign: 'center',
              })
            } catch {
              doc.fillColor('#666666').fontSize(10).font(bodyFont)
                 .text(productName, x + 8, y + h / 2 - 6, { width: w - 16, align: 'center' })
            }
          } else {
            doc.save()
            doc.roundedRect(x + 8, y + 8, w - 16, h - 16, 8).fill('rgba(255,255,255,0.05)')
            doc.fillColor('#666666').fontSize(10).font(bodyFont)
               .text(productName, x + 8, y + h / 2 - 6, { width: w - 16, align: 'center' })
            doc.restore()
          }
          break

        case 'specsZone':
          doc.fillColor(mutedColor).fontSize(labelSize).font(displayFont)
             .text('ESPECIFICACOES', x + 8, y + 6, { characterSpacing: 1.5 })
          doc.fillColor('#999999').fontSize(9).font(bodyFont)
             .text('Consulte ficha tecnica completa', x + 8, doc.y + 6, { width: w - 16 })
          break

        default:
          // Skip unknown zones — do not render labels in export
          break
      }
    }
  }

  private async renderSalesSheetDefault(
    doc: PDFKit.PDFDocument,
    content: Record<string, any>,
    productName: string,
    pageW: number,
    pageH: number,
    visualSystem?: { palette: any; typography: any; background: any } | null,
  ) {
    const ACCENT = visualSystem?.palette?.accent ?? '#F59E0B'
    const TEXT_PRIMARY = visualSystem?.palette?.text ?? '#F9FAFB'
    const TEXT_MUTED = visualSystem?.palette?.muted ?? '#9CA3AF'
    const BG_DARK = visualSystem?.palette?.background ?? '#111827'
    const displayFont = this.resolveFont(visualSystem?.typography?.displayFont) ?? 'Helvetica-Bold'
    const bodyFont = this.resolveFont(visualSystem?.typography?.bodyFont) ?? 'Helvetica'
    const headlineSize = visualSystem?.typography?.scale?.headline ?? 26
    const bodySize = visualSystem?.typography?.scale?.body ?? 12
    const labelSize = visualSystem?.typography?.scale?.label ?? 8

    // Accent strip
    doc.rect(0, 0, pageW, 5).fill(ACCENT)
    doc.rect(0, 0, 5, pageH).fill(ACCENT)

    // Brand
    const defaultLogoBuffer = content.logoUrl ? await fetchImageBuffer(content.logoUrl) : null
    if (defaultLogoBuffer) {
      try {
        doc.image(defaultLogoBuffer, 24, 16, { fit: [120, 30] })
      } catch {
        doc.fillColor(ACCENT).fontSize(8).font(displayFont)
           .text('MULTILASER', 24, 22, { characterSpacing: 3 })
      }
    } else {
      doc.fillColor(ACCENT).fontSize(8).font(displayFont)
         .text('MULTILASER', 24, 22, { characterSpacing: 3 })
    }
    doc.fillColor(TEXT_MUTED).fontSize(10).font(bodyFont)
       .text(productName, 24, 36)

    doc.rect(24, 52, pageW - 48, 1).fill('#374151')

    if (content.headline) {
      this.drawTextWithShadow(doc, content.headline, 24, 64, {
        font: displayFont,
        fontSize: headlineSize,
        color: TEXT_PRIMARY,
        width: pageW - 48,
        lineGap: 4,
      })
    }

    if (content.subtitle) {
      doc.fillColor(ACCENT).fontSize(13).font(bodyFont)
         .text(content.subtitle, 24, doc.y + 10, { width: pageW - 48 })
    }

    doc.rect(24, doc.y + 14, pageW - 48, 1).fill('#374151')

    if (content.benefits?.length) {
      doc.fillColor(TEXT_MUTED).fontSize(labelSize).font(displayFont)
         .text('BENEFICIOS', 24, doc.y + 8, { characterSpacing: 1.5 })
      doc.fillColor(TEXT_PRIMARY).fontSize(bodySize).font(bodyFont)
      for (const b of content.benefits) {
        doc.text(`▸  ${b}`, 24, doc.y + 8, { width: pageW - 48, lineGap: 2 })
      }
    }

    if (content.cta) {
      const ctaY = pageH - 120
      doc.roundedRect(24, ctaY, pageW - 48, 36, 8).fill(ACCENT)
      doc.fillColor(BG_DARK).fontSize(13).font(displayFont)
         .text(content.cta, 24, ctaY + 10, { width: pageW - 48, align: 'center' })
    }

    // Footer
    doc.rect(0, pageH - 44, pageW, 44).fill('#1F2937')
    doc.rect(0, pageH - 44, pageW, 1).fill(ACCENT)
    doc.fillColor(TEXT_MUTED).fontSize(8).font(bodyFont)
       .text('multilaser.com.br', 24, pageH - 28)
  }

  private renderSlideWithZones(
    doc: PDFKit.PDFDocument,
    content: SlideContent,
    zones: Record<string, ZoneConfig>,
    pageW: number,
    pageH: number,
  ) {
    for (const [zoneName, zone] of Object.entries(zones)) {
      const { x, y, w, h } = resolveZone(zone, pageW, pageH)

      switch (zoneName) {
        case 'titleZone':
          if (content.title) {
            const fs = content.type === 'cover' ? 32 : 24
            doc.fillColor('#F9FAFB').fontSize(fs).font('Helvetica-Bold')
               .text(content.title, x + 8, y + 8, { width: w - 16, lineGap: 4 })
          }
          break
        case 'bodyZone':
          if (content.body?.length) {
            doc.fillColor('#F9FAFB').fontSize(12).font('Helvetica')
            for (const item of content.body) {
              doc.text(`• ${item}`, x + 8, doc.y + 6, { width: w - 16, lineGap: 3 })
            }
          }
          break
        case 'logoZone':
          doc.fillColor('#666666').fontSize(8).font('Helvetica-Bold')
             .text('MULTILASER', x + 4, y + (h - 8) / 2)
          break
        case 'footerZone':
          doc.rect(x, y, w, h).fill('#1F2937')
          doc.fillColor('#6B7280').fontSize(7).font('Helvetica')
             .text('Multilaser — Confidencial', x, y + (h - 8) / 2, { width: w, align: 'center' })
          break
        default:
          break
      }
    }
  }

  private renderSlideDefault(
    doc: PDFKit.PDFDocument,
    content: SlideContent,
    pageW: number,
    pageH: number,
  ) {
    const ACCENT = '#F59E0B'
    const TEXT_PRIMARY = '#F9FAFB'
    const TEXT_MUTED = '#9CA3AF'

    doc.rect(0, 0, pageW, 4).fill(ACCENT)

    doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica-Bold')
       .text(this.typeLabel(content.type).toUpperCase(), 36, 20, { characterSpacing: 1.5 })

    if (content.title) {
      const fs = content.type === 'cover' ? 32 : 24
      doc.fillColor(TEXT_PRIMARY).fontSize(fs).font('Helvetica-Bold')
         .text(content.title, 36, 46, { width: pageW - 72, lineGap: 4 })
    }

    if (content.subtitle) {
      doc.fillColor(ACCENT).fontSize(13).font('Helvetica-Oblique')
         .text(content.subtitle, 36, doc.y + 14, { width: pageW - 72 })
    }

    if (content.body?.length) {
      doc.fillColor(TEXT_PRIMARY).fontSize(12).font('Helvetica')
      for (const item of content.body) {
        doc.text(`• ${item}`, 36, doc.y + 6, { width: pageW - 72, lineGap: 3 })
      }
    }

    if (content.cta) {
      const ctaY = pageH - 60
      doc.roundedRect(36, ctaY, 180, 30, 6).fill(ACCENT)
      doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold')
         .text(content.cta, 36, ctaY + 8, { width: 180, align: 'center' })
    }
  }

  /** Register all available TTF fonts from the assets/fonts directory */
  private registerFonts(doc: PDFKit.PDFDocument): void {
    const fontsDir = path.join(__dirname, '..', '..', '..', 'assets', 'fonts')
    const fontFiles: Record<string, string> = {
      'Inter': 'Inter-Variable.ttf',
      'Montserrat': 'Montserrat-Variable.ttf',
      'PlayfairDisplay': 'PlayfairDisplay-Variable.ttf',
      'Oswald': 'Oswald-Variable.ttf',
      'Poppins': 'Poppins-SemiBold.ttf',
      'Nunito': 'Nunito-Variable.ttf',
      'SourceSans3': 'SourceSans3-Variable.ttf',
      'OpenSans': 'OpenSans-Variable.ttf',
      'DMSerifDisplay': 'DMSerifDisplay-Regular.ttf',
      'DMSans': 'DMSans-Variable.ttf',
    }
    for (const [fontName, fileName] of Object.entries(fontFiles)) {
      const fontPath = path.join(fontsDir, fileName)
      if (fs.existsSync(fontPath)) {
        try {
          doc.registerFont(fontName, fontPath)
        } catch {
          // Skip fonts that fail to register
        }
      }
    }
  }

  /**
   * Resolve a display/body font name from visualSystem to a registered font name.
   * Falls back to null when name does not match any registered font.
   */
  private resolveFont(fontName?: string | null): string | null {
    if (!fontName) return null
    const knownFonts: Record<string, string> = {
      Inter: 'Inter',
      Montserrat: 'Montserrat',
      'Playfair Display': 'PlayfairDisplay',
      PlayfairDisplay: 'PlayfairDisplay',
      Oswald: 'Oswald',
      Poppins: 'Poppins',
      Nunito: 'Nunito',
      'Source Sans 3': 'SourceSans3',
      SourceSans3: 'SourceSans3',
      'Open Sans': 'OpenSans',
      OpenSans: 'OpenSans',
      'DM Serif Display': 'DMSerifDisplay',
      DMSerifDisplay: 'DMSerifDisplay',
      'DM Sans': 'DMSans',
      DMSans: 'DMSans',
    }
    return knownFonts[fontName] ?? null
  }

  /**
   * Draw text with a subtle shadow effect (render shadow offset first, then actual text).
   */
  private drawTextWithShadow(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    opts: { font: string; fontSize: number; color: string; width?: number; lineGap?: number; align?: string },
  ): void {
    const { font, fontSize, color, width, lineGap, align } = opts
    // Shadow pass: 1px offset, dark color at low opacity
    doc.fillColor('#000000', 0.25).fontSize(fontSize).font(font)
       .text(text, x + 1, y + 1, { width, lineGap, align: align as any })
    // Actual text pass
    doc.fillColor(color).fontSize(fontSize).font(font)
       .text(text, x, y, { width, lineGap, align: align as any })
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
}
