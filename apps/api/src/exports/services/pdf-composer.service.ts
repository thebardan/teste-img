import { Injectable } from '@nestjs/common'
import PDFDocument from 'pdfkit'
import type { SlideContent } from './pptx-composer.service'

// A4 landscape: 841.89 × 595.28 pt  (pdfkit default pt unit)
const W = 841.89
const H = 595.28

// Sales sheet: A4 portrait  595.28 × 841.89 pt
const SS_W = 595.28
const SS_H = 841.89

const DARK_BG      = '#111827'
const CARD_BG      = '#1F2937'
const ACCENT       = '#F59E0B'
const TEXT_PRIMARY = '#F9FAFB'
const TEXT_MUTED   = '#9CA3AF'

@Injectable()
export class PdfComposerService {
  /** PDF with one page per slide (16:9 A4 landscape) */
  async composePresentation(
    title: string,
    slides: { order: number; content: SlideContent }[],
  ): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))

    const sorted = [...slides].sort((a, b) => a.order - b.order)
    let first = true

    for (const { content } of sorted) {
      if (!first) doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
      first = false

      // Background
      doc.rect(0, 0, W, H).fill(DARK_BG)

      // Accent strip top
      doc.rect(0, 0, W, 4).fill(ACCENT)

      // Type label
      doc
        .fillColor(TEXT_MUTED).fontSize(7).font('Helvetica-Bold')
        .text(this.typeLabel(content.type).toUpperCase(), 36, 20, { characterSpacing: 1.5 })

      // Title
      if (content.title) {
        const fs = content.type === 'cover' ? 32 : 24
        doc.fillColor(TEXT_PRIMARY).fontSize(fs).font('Helvetica-Bold')
           .text(content.title, 36, 46, { width: W - 72, lineGap: 4 })
      }

      const afterTitle = doc.y + 14

      // Subtitle
      if (content.subtitle) {
        doc.fillColor(ACCENT).fontSize(13).font('Helvetica-Oblique')
           .text(content.subtitle, 36, afterTitle, { width: W - 72 })
      }

      const afterSubtitle = doc.y + 12

      // Body bullets
      if (content.body?.length) {
        doc.fillColor(TEXT_PRIMARY).fontSize(12).font('Helvetica')
        for (const item of content.body) {
          doc.text(`• ${item}`, 36, doc.y + 6, { width: W - 72, lineGap: 3 })
        }
      }

      // CTA
      if (content.cta) {
        const ctaY = H - 60
        doc.roundedRect(36, ctaY, 180, 30, 6).fill(ACCENT)
        doc.fillColor(DARK_BG).fontSize(11).font('Helvetica-Bold')
           .text(content.cta, 36, ctaY + 8, { width: 180, align: 'center' })
      }

      // Footer
      doc.rect(0, H - 18, W, 18).fill(CARD_BG)
      doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica')
         .text('Multilaser — Confidencial', 0, H - 12, { width: W, align: 'center' })

      void afterSubtitle
    }

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      doc.end()
    })
  }

  /** PDF for a single sales sheet (A4 portrait) */
  async composeSalesSheet(content: Record<string, any>, productName: string): Promise<Buffer> {
    const doc = new PDFDocument({ size: 'A4', layout: 'portrait', margin: 0 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))

    // Background
    doc.rect(0, 0, SS_W, SS_H).fill(DARK_BG)

    // Accent strip top
    doc.rect(0, 0, SS_W, 5).fill(ACCENT)

    // Accent strip left
    doc.rect(0, 0, 5, SS_H).fill(ACCENT)

    // Brand label
    doc.fillColor(ACCENT).fontSize(8).font('Helvetica-Bold')
       .text('MULTILASER', 24, 22, { characterSpacing: 3 })

    // Product name
    doc.fillColor(TEXT_MUTED).fontSize(10).font('Helvetica')
       .text(productName, 24, 36)

    // Separator
    doc.rect(24, 52, SS_W - 48, 1).fill('#374151')

    // Headline
    if (content.headline) {
      doc.fillColor(TEXT_PRIMARY).fontSize(26).font('Helvetica-Bold')
         .text(content.headline, 24, 64, { width: SS_W - 48, lineGap: 4 })
    }

    // Subtitle
    if (content.subtitle) {
      doc.fillColor(ACCENT).fontSize(13).font('Helvetica-Oblique')
         .text(content.subtitle, 24, doc.y + 10, { width: SS_W - 48 })
    }

    // Separator
    doc.rect(24, doc.y + 14, SS_W - 48, 1).fill('#374151')
    const benefitsY = doc.y + 20

    // Benefits
    if (content.benefits?.length) {
      doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica-Bold')
         .text('BENEFÍCIOS', 24, benefitsY, { characterSpacing: 1.5 })

      doc.fillColor(TEXT_PRIMARY).fontSize(12).font('Helvetica')
      for (const b of content.benefits) {
        doc.text(`▸  ${b}`, 24, doc.y + 8, { width: SS_W - 48, lineGap: 2 })
      }
    }

    // CTA
    if (content.cta) {
      const ctaY = SS_H - 120
      doc.roundedRect(24, ctaY, SS_W - 48, 36, 8).fill(ACCENT)
      doc.fillColor(DARK_BG).fontSize(13).font('Helvetica-Bold')
         .text(content.cta, 24, ctaY + 10, { width: SS_W - 48, align: 'center' })
    }

    // Footer
    doc.rect(0, SS_H - 44, SS_W, 44).fill(CARD_BG)
    doc.rect(0, SS_H - 44, SS_W, 1).fill(ACCENT)
    doc.fillColor(TEXT_MUTED).fontSize(8).font('Helvetica')
       .text('multilaser.com.br', 24, SS_H - 28)
    doc.fillColor(TEXT_MUTED).fontSize(7).font('Helvetica')
       .text('Material de uso interno — Multilaser', 0, SS_H - 17, { width: SS_W, align: 'center' })

    return new Promise((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)
      doc.end()
    })
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
