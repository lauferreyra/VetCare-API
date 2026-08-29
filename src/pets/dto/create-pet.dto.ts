import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreatePetDto {
  @ApiProperty({
    example: 'Firulais',
  })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'Perro',
  })
  @IsString()
  species: string;

  @ApiPropertyOptional({
    example: 'Labrador',
  })
  @IsOptional()
  @IsString()
  breed?: string;

  @ApiPropertyOptional({
    example: '2022-05-10',
  })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiProperty({
    example: 1,
  })
  @IsInt()
  ownerId: number;
}