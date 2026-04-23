import { IsString, IsOptional, IsArray, IsInt, ValidateNested, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class AnnotationDto {
  @IsString()
  @IsOptional()
  targetField?: string

  @IsInt()
  @Min(0)
  @IsOptional()
  targetSlideOrder?: number

  @IsString()
  comment!: string
}

export class ReviewActionDto {
  @IsString()
  @IsOptional()
  comment?: string

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnnotationDto)
  @IsOptional()
  annotations?: AnnotationDto[]
}
