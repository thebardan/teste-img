import { IsString, IsEnum, IsOptional, IsBoolean, IsObject } from 'class-validator'
import { TemplateType } from '@prisma/client'

export class CreateTemplateDto {
  @IsString()
  name: string

  @IsEnum(TemplateType)
  type: TemplateType

  @IsString()
  @IsOptional()
  description?: string

  @IsObject()
  zonesConfig: Record<string, any>

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
