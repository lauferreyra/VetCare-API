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
  @IsDateString()
  date: string;

  @IsString()
  @MinLength(3)
  reason: string;

  @IsInt()
  petId: number;

  @IsOptional()
  @IsEnum(AppointmentStatus)
  status?: AppointmentStatus;
}