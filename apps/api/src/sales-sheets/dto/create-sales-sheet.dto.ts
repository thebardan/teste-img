import { IsString, IsOptional } from 'class-validator'

export class CreateSalesSheetDto {
  @IsString()
  productId: string

  @IsOptional()
  @IsString()
  templateId?: string

  @IsOptional()
  @IsString()
  channel?: string

  @IsOptional()
  @IsString()
  qrUrl?: string
}
