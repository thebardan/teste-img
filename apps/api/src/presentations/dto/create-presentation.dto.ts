import { IsString, IsArray, IsOptional } from 'class-validator'

export class CreatePresentationDto {
  @IsOptional()
  @IsString()
  clientId?: string

  @IsArray()
  @IsString({ each: true })
  productIds: string[]

  @IsOptional()
  @IsString()
  focus?: string

  @IsOptional()
  @IsString()
  channel?: string

  @IsOptional()
  @IsString()
  templateId?: string
}
