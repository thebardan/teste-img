import { Injectable } from '@nestjs/common'
import * as PDFDocument from 'pdfkit'
import type { SlideContent } from './pptx-composer.service'
import { QrCodeService } from './qrcode.service'

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

    // If we have the Gemini-generated art, use it as full-page image
    if (artImageBuffer) {
      try {
        doc.image(artImageBuffer, 0, 0, { width: pageW, height: pageH })
      } catch {
        // If image fails (corrupt/unsupported), fall back to composed layout
        await this.renderFallback(doc, content, productName, zonesConfig, pageW, pageH)
      }
    } else {
      await this.renderFallback(doc, content, productName, zonesConfig, pageW, pageH)
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
  ) {
    const colors = content.visualDirection?.colors ?? ['#111827', '#1a2332']
    doc.rect(0, 0, pageW, pageH).fill(colors[0])
    if (colors[1]) {
      doc.save()
      doc.rect(pageW * 0.4, 0, pageW * 0.6, pageH).fill(colors[1])
      doc.restore()
    }
    if (zonesConfig) {
      await this.renderSalesSheetWithZones(doc, content, productName, zonesConfig, pageW, pageH)
    } else {
      await this.renderSalesSheetDefault(doc, content, productName, pageW, pageH)
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
  ) {
    for (const [zoneName, zone] of Object.entries(zones)) {
      const { x, y, w, h } = resolveZone(zone, pageW, pageH)

      switch (zoneName) {
        case 'headlineZone':
          if (content.headline) {
            doc.fillColor('#FFFFFF').fontSize(22).font('Helvetica-Bold')
               .text(content.headline, x + 8, y + 8, { width: w - 16, lineGap: 3 })
          }
          if (content.subtitle) {
            doc.fillColor('#E0E0E0').fontSize(11).font('Helvetica')
               .text(content.subtitle, x + 8, doc.y + 6, { width: w - 16 })
          }
          break

        case 'benefitsZone':
          doc.fillColor('#D0D0D0').fontSize(7).font('Helvetica-Bold')
             .text('BENEFICIOS', x + 8, y + 6, { characterSpacing: 1.5 })
          if (content.benefits?.length) {
            doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica')
            for (const b of content.benefits) {
              doc.text(`▸  ${b}`, x + 8, doc.y + 6, { width: w - 16, lineGap: 2 })
            }
          }
          break

        case 'ctaZone':
          if (content.cta) {
            const ctaW = Math.min(w - 16, 200)
            const ctaX = x + (w - ctaW) / 2
            doc.roundedRect(ctaX, y + (h - 28) / 2, ctaW, 28, 6).fill('#FFFFFF')
            doc.fillColor('#111827').fontSize(11).font('Helvetica-Bold')
               .text(content.cta, ctaX, y + (h - 28) / 2 + 8, { width: ctaW, align: 'center' })
          }
          break

        case 'logoZone':
          // Logo placeholder text
          doc.save()
          doc.roundedRect(x + 4, y + (h - 24) / 2, 60, 24, 4).fill('rgba(255,255,255,0.15)')
          doc.fillColor('#FFFFFF').fontSize(8).font('Helvetica-Bold')
             .text('MULTILASER', x + 8, y + (h - 8) / 2, { width: w - 8 })
          doc.restore()
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
          // Product image placeholder area - render a subtle card
          doc.save()
          doc.roundedRect(x + 8, y + 8, w - 16, h - 16, 8).fill('rgba(255,255,255,0.05)')
          doc.fillColor('#666666').fontSize(10).font('Helvetica')
             .text(productName, x + 8, y + h / 2 - 6, { width: w - 16, align: 'center' })
          doc.restore()
          break

        case 'specsZone':
          doc.fillColor('#D0D0D0').fontSize(7).font('Helvetica-Bold')
             .text('ESPECIFICACOES', x + 8, y + 6, { characterSpacing: 1.5 })
          doc.fillColor('#999999').fontSize(9).font('Helvetica')
             .text('Consulte ficha tecnica completa', x + 8, doc.y + 6, { width: w - 16 })
          break

        default:
          // Render zone name as subtle label
          doc.fillColor('#444444').fontSize(7).font('Helvetica')
             .text(zoneName.replace('Zone', ''), x + 4, y + 4)
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
  ) {
    const ACCENT = '#F59E0B'
    const TEXT_PRIMARY = '#F9FAFB'
    const TEXT_MUTED = '#9CA3AF'

    // Accent strip
    doc.rect(0, 0, pageW, 5).fill(ACCENT)
    doc.rect(0, 0, 5, pageH).fill(ACCENT)

    // Brand
    doc.fillColor(ACCENT).fontSize(8).font('Helvetica-Bold')
       .text('MULTILASER', 24, 22, { characterSpacing: 3 })
    doc.fillColor(TEXT_MUTED).fontSize(10).font('Helvetica')
       .text(productName, 24, 36)

    doc.rect(24, 52, pageW - 48, 1).fill('#374151')

    if (content.headline) {
      doc.fillColor(TEXT_PRIMARY).fontSize(26).font('Helvetica-Bold')
         .text(content.headline, 24, 64, { width: pageW - 48, lineGap: 4 })
    }

    if (content.subtitle) {
      doc.fillColor(ACCENT).fontSize(13).font('Helvetica-Oblique')
         .text(content.subtitle, 24, doc.y + 10, { width: pageW - 48 })
    }

    doc.rect(24, doc.y + 14, pageW - 48, 1).fill('#374151')

    if (content.benefits?.length) {
      doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica-Bold')
         .text('BENEFICIOS', 24, doc.y + 8, { characterSpacing: 1.5 })
      doc.fillColor(TEXT_PRIMARY).fontSize(12).font('Helvetica')
      for (const b of content.benefits) {
        doc.text(`▸  ${b}`, 24, doc.y + 8, { width: pageW - 48, lineGap: 2 })
      }
    }

    if (content.cta) {
      const ctaY = pageH - 120
      doc.roundedRect(24, ctaY, pageW - 48, 36, 8).fill(ACCENT)
      doc.fillColor('#111827').fontSize(13).font('Helvetica-Bold')
         .text(content.cta, 24, ctaY + 10, { width: pageW - 48, align: 'center' })
    }

    // Footer
    doc.rect(0, pageH - 44, pageW, 44).fill('#1F2937')
    doc.rect(0, pageH - 44, pageW, 1).fill(ACCENT)
    doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica')
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
