import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePrescriptionDto {
  @IsInt()
  petId: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsString()
  @MinLength(2)
  medication: string;

  @IsString()
  @MinLength(2)
  dosage: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}