import { IsArray, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class AssessmentItemDto {
  @IsString()
  name: string;

  @IsNumber()
  score: number;

  @IsNumber()
  max: number;
}

export class UpdateGradeDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentItemDto)
  @IsOptional()
  cats?: AssessmentItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssessmentItemDto)
  @IsOptional()
  assignments?: AssessmentItemDto[];

  @IsNumber()
  @IsOptional()
  examScore?: number;

  @IsNumber()
  @IsOptional()
  examMax?: number;
}