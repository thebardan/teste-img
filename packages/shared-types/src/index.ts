// Approval status machine
export type ApprovalStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

// Generation job status
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

// Export artifact types
export type ExportArtifactType = 'PNG' | 'JPEG' | 'PDF' | 'PPTX'

// Product domain
export interface ProductSummary {
  id: string
  sku: string
  name: string
  brand: string
  category: string
  subcategory?: string
  description: string
  imageUrls: string[]
  /** ISO 8601 string — use for sorting and cache invalidation */
  createdAt: string
}

// Brand asset types
export type BrandAssetType = 'LOGO' | 'ICON' | 'PATTERN' | 'COLOR_SWATCH'
export type BackgroundType = 'DARK' | 'LIGHT' | 'COLORED' | 'ANY'

/** Structured brand asset summary returned by API endpoints */
export interface BrandAssetSummary {
  id: string
  name: string
  type: BrandAssetType
  url: string
  bestOn: BackgroundType
  description?: string
}

// Template types
export type TemplateType =
  | 'SALES_SHEET_HORIZONTAL'
  | 'SALES_SHEET_VERTICAL'
  | 'SALES_SHEET_A4'
  | 'DECK_CORPORATE'
  | 'DECK_RETAIL'
  | 'DECK_PREMIUM'
  | 'DECK_DISTRIBUTOR'

// Presentation slide types
/**
 * Slide type — lowercase intentional.
 * This type represents the `type` field inside the SlideContent JSON blob
 * stored in PresentationSlide.content (Prisma Json column), NOT a Prisma enum.
 * Do not uppercase these values.
 */
export type SlideType = 'cover' | 'context' | 'products' | 'benefits' | 'closing'

// User roles
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'APPROVER'

// Pagination
/** Page numbers are 1-indexed throughout the platform */
export interface PaginatedResult<T> {
  data: T[]
  /** Total number of records matching the query */
  total: number
  /** Current page number (1-indexed) */
  currentPage: number
  pageSize: number
  totalPages: number
}
