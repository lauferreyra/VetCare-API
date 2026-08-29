import {
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateClinicalRecordDto {
  @IsInt()
  petId: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsString()
  @MinLength(3)
  reason: string;

  @IsString()
  @MinLength(3)
  diagnosis: string;

  @IsOptional()
  @IsString()
  treatment?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}