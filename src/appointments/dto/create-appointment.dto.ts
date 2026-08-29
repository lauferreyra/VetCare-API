import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateAppointmentDto {
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

  @ApiProperty({
    example: 25,
    description: 'ID del horario disponible seleccionado',
  })
  @IsInt()
  slotId: number;
}