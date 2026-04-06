import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import type { ProductFiltersDto } from './dto/product-filters.dto'
import type { ProductSummaryDto, ProductDetailDto, PaginatedProductsDto } from './dto/product-response.dto'

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaClient) {}

  async findAll(filters: ProductFiltersDto): Promise<PaginatedProductsDto> {
    console.log('[ProductsService] filters received:', JSON.stringify(filters))
    const page = Number(filters.page) || 1
    const pageSize = Number(filters.pageSize) || 20
    const skip = (page - 1) * pageSize
    console.log('[ProductsService] page=%d pageSize=%d skip=%d', page, pageSize, skip)

    const where: any = {}
    if (filters.isActive !== undefined) where.isActive = filters.isActive
    if (filters.category) where.category = { contains: filters.category, mode: 'insensitive' }
    if (filters.brand) where.brand = { contains: filters.brand, mode: 'insensitive' }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { name: 'asc' },
        include: {
          images: { where: { isPrimary: true }, take: 1 },
        },
      }),
      this.prisma.product.count({ where }),
    ])

    return {
      data: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        brand: p.brand,
        category: p.category,
        subcategory: p.subcategory,
        description: p.description,
        qrDestination: p.qrDestination,
        isActive: p.isActive,
        primaryImageUrl: p.images[0]?.url ?? null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
      })),
      total,
      page,
      pageSize,
    }
  }

  async findOne(id: string): Promise<ProductDetailDto> {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: { orderBy: { order: 'asc' } },
        specifications: { orderBy: { group: 'asc' } },
        benefits: { orderBy: { order: 'asc' } },
        claims: true,
        packaging: true,
        links: true,
      },
    })

    if (!product) throw new NotFoundException(`Product ${id} not found`)

    return {
      id: product.id,
      sku: product.sku,
      name: product.name,
      brand: product.brand,
      category: product.category,
      subcategory: product.subcategory,
      description: product.description,
      qrDestination: product.qrDestination,
      isActive: product.isActive,
      primaryImageUrl: product.images.find((i) => i.isPrimary)?.url ?? product.images[0]?.url ?? null,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      images: product.images,
      specifications: product.specifications,
      benefits: product.benefits,
      claims: product.claims,
      packaging: product.packaging,
      links: product.links,
    }
  }

  async getCategories(): Promise<string[]> {
    const results = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    return results.map((r) => r.category)
  }

  async getBrands(): Promise<string[]> {
    const results = await this.prisma.product.findMany({
      where: { isActive: true },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    })
    return results.map((r) => r.brand)
  }
}
