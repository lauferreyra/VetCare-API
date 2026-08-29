import { IsDateString, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreatePetDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  species: string;

  @IsOptional()
  @IsString()
  breed?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsInt()
  ownerId: number;
}