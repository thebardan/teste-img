// Approval status machine
export type ApprovalStatus = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'ARCHIVED'

// Generation job status
export type JobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'

// Export artifact types
export type ArtifactType = 'PNG' | 'JPEG' | 'PDF' | 'PPTX'

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
}

// Brand asset types
export type BrandAssetType = 'LOGO' | 'ICON' | 'PATTERN' | 'COLOR_SWATCH'
export type BackgroundType = 'DARK' | 'LIGHT' | 'COLORED' | 'ANY'

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
export type SlideType = 'cover' | 'context' | 'products' | 'benefits' | 'closing'

// User roles
export type UserRole = 'ADMIN' | 'EDITOR' | 'VIEWER' | 'APPROVER'

// Pagination
export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  pageSize: number
}
