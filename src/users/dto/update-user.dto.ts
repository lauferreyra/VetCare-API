import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { Role } from '../../generated/prisma/client.js';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Lautaro Ferreyra',
  })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({
    example: 'lautaro@vetcare.com',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    enum: Role,
    example: Role.USER,
  })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}