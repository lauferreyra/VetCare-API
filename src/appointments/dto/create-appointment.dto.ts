import {
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';

import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

import { AppointmentStatus } from '../../generated/prisma/client.js';

export class CreateAppointmentDto {
  @ApiProperty({
    example: '2026-09-05T15:30:00.000Z',
  })
  @IsDateString()
  date: string;

  @ApiProperty({
    example: 'Control anual',
  })
  @IsString()
  @MinLength(3)
  reason: string;

  @ApiProperty({
    example: 1,
  })
  @IsInt()
  petId: number;

  @ApiPropertyOptional({
    enum: AppointmentStatus,
    example: AppointmentStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}