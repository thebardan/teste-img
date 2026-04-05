import { IsString, IsObject } from 'class-validator'

export class CreateVariantDto {
  @IsString()
  name: string

  @IsObject()
  zonesConfig: Record<string, any>
}
