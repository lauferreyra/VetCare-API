import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { AppointmentsService } from './appointments.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { UseGuards } from '@nestjs/common';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Appointments')
@ApiBearerAuth()
@Controller('appointments')
export class AppointmentsController {
  constructor(
    private readonly appointmentsService: AppointmentsService,
  ) {}

@Get()
@UseGuards(JwtAuthGuard)
findAll(
  @CurrentUser() user: JwtPayload
) {
  return this.appointmentsService.findAllByUser(user.sub);
}

@Get(':id')
@UseGuards(JwtAuthGuard)
findOne(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: JwtPayload
) {
  return this.appointmentsService.findOneByUser(id, user.sub);
}

  @Post()
@UseGuards(JwtAuthGuard)
create(
  @Body() dto: CreateAppointmentDto,
  @CurrentUser() user: {
    sub: number;
    email: string;
    role: string;
  },
) {
  return this.appointmentsService.create(dto, user.sub);
}

 @Patch(":id")
@UseGuards(JwtAuthGuard)
update(
  @Param("id", ParseIntPipe) id: number,
  @Body() dto: UpdateAppointmentDto,
  @CurrentUser() user: JwtPayload,
) {
  return this.appointmentsService.update(
    id,
    dto,
    user.sub,
  );
}

@Delete(":id")
@UseGuards(JwtAuthGuard)
remove(
  @Param("id", ParseIntPipe) id: number,
  @CurrentUser() user: JwtPayload,
) {
  return this.appointmentsService.remove(
    id,
    user.sub,
  );
}
}