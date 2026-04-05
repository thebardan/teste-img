export interface ProductImageDto {
  id: string
  url: string
  altText: string | null
  isPrimary: boolean
  order: number
}

export interface ProductSpecDto {
  id: string
  key: string
  value: string
  unit: string | null
  group: string | null
}

export interface ProductBenefitDto {
  id: string
  text: string
  order: number
}

export interface ProductClaimDto {
  id: string
  text: string
  isVerified: boolean
}

export interface ProductPackagingDto {
  weightKg: number | null
  widthCm: number | null
  heightCm: number | null
  depthCm: number | null
  unitsPerBox: number | null
  eanCode: string | null
}

export interface ProductLinkDto {
  id: string
  label: string
  url: string
  type: string
}

export interface ProductSummaryDto {
  id: string
  sku: string
  name: string
  brand: string
  category: string
  subcategory: string | null
  description: string
  qrDestination: string | null
  isActive: boolean
  primaryImageUrl: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ProductDetailDto extends ProductSummaryDto {
  images: ProductImageDto[]
  specifications: ProductSpecDto[]
  benefits: ProductBenefitDto[]
  claims: ProductClaimDto[]
  packaging: ProductPackagingDto | null
  links: ProductLinkDto[]
}

export interface PaginatedProductsDto {
  data: ProductSummaryDto[]
  total: number
  page: number
  pageSize: number
}
