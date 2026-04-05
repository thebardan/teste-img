import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator'

export class UpdateTemplateDto {
  @IsString()
  @IsOptional()
  name?: string

  @IsString()
  @IsOptional()
  description?: string

  @IsObject()
  @IsOptional()
  zonesConfig?: Record<string, any>

  @IsBoolean()
  @IsOptional()
  isActive?: boolean
}
