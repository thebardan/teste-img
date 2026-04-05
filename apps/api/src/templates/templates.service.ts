import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaClient, TemplateType } from '@prisma/client'
import type { CreateTemplateDto } from './dto/create-template.dto'
import type { UpdateTemplateDto } from './dto/update-template.dto'
import type { CreateVariantDto } from './dto/create-variant.dto'

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaClient) {}

  findAll(type?: TemplateType, activeOnly = false) {
    return this.prisma.template.findMany({
      where: {
        ...(type ? { type } : {}),
        ...(activeOnly ? { isActive: true } : {}),
      },
      include: { variants: true },
      orderBy: [{ type: 'asc' }, { name: 'asc' }],
    })
  }

  async findOne(id: string) {
    const template = await this.prisma.template.findUnique({
      where: { id },
      include: { variants: true },
    })
    if (!template) throw new NotFoundException(`Template ${id} not found`)
    return template
  }

  create(dto: CreateTemplateDto) {
    return this.prisma.template.create({
      data: {
        name: dto.name,
        type: dto.type,
        description: dto.description,
        zonesConfig: dto.zonesConfig,
        isActive: dto.isActive ?? true,
      },
      include: { variants: true },
    })
  }

  async update(id: string, dto: UpdateTemplateDto) {
    await this.findOne(id)
    return this.prisma.template.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.zonesConfig !== undefined ? { zonesConfig: dto.zonesConfig } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
      include: { variants: true },
    })
  }

  async remove(id: string) {
    await this.findOne(id)
    return this.prisma.template.delete({ where: { id } })
  }

  async addVariant(templateId: string, dto: CreateVariantDto) {
    await this.findOne(templateId)
    return this.prisma.templateVariant.create({
      data: { templateId, name: dto.name, zonesConfig: dto.zonesConfig },
    })
  }

  async removeVariant(templateId: string, variantId: string) {
    const variant = await this.prisma.templateVariant.findFirst({
      where: { id: variantId, templateId },
    })
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`)
    return this.prisma.templateVariant.delete({ where: { id: variantId } })
  }
}
