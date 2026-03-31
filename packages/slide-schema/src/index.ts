import { z } from 'zod'

const LayoutConfigSchema = z.object({
  templateId: z.string(),
  zones: z.record(z.any()), // zone overrides; template defines defaults
})

// ─── Sales Sheet (single-page composition) ───────────────────────────────────

export const SalesSheetContentSchema = z.object({
  headline: z.string().min(1),
  subtitle: z.string().optional(),
  benefits: z.array(z.string()).min(1).max(5),
  cta: z.string().min(1),
  productImageUrl: z.string().url(),
  generatedVisualUrl: z.string().url().optional(), // Gemini output
  logoAssetId: z.string(),
  qrUrl: z.string().url(),
  layout: LayoutConfigSchema,
})

export type SalesSheetContent = z.infer<typeof SalesSheetContentSchema>

// ─── Slide (16:9 presentation slide) ─────────────────────────────────────────

const SlideProductSchema = z.object({
  productId: z.string(),
  name: z.string(),
  imageUrl: z.string().url().optional(),
  highlights: z.array(z.string()),
})

const ComparativeSchema = z.object({
  attribute: z.string(),
  ourValue: z.string(),
  competitorValue: z.string().optional(),
  flaggedForReview: z.boolean().default(true), // always flag comparatives
})

export const SlideContentSchema = z.object({
  type: z.enum(['cover', 'context', 'products', 'benefits', 'closing']),
  title: z.string().min(1),
  subtitle: z.string().optional(),
  body: z.array(z.string()).optional(),
  heroImageUrl: z.string().url().optional(),
  logoAssetId: z.string().optional(),
  qrUrl: z.string().url().optional(),
  cta: z.string().optional(),
  products: z.array(SlideProductSchema).optional(),
  comparatives: z.array(ComparativeSchema).optional(),
  layout: LayoutConfigSchema,
})

export type SlideContent = z.infer<typeof SlideContentSchema>
export type SlideProduct = z.infer<typeof SlideProductSchema>
export type Comparative = z.infer<typeof ComparativeSchema>
export type LayoutConfig = z.infer<typeof LayoutConfigSchema>
