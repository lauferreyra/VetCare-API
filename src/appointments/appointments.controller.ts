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
import { Query } from '@nestjs/common';
import { AvailabilityQueryDto } from './dto/availability-query.dto.js';
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
import { Role } from '../generated/prisma/client.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';

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

@Get('availability')
@UseGuards(JwtAuthGuard)
getAvailability(
  @Query() query: AvailabilityQueryDto,
) {
  return this.appointmentsService.getAvailability(
    query.date,
  );
}

@Get(':id')
@UseGuards(JwtAuthGuard)
findOne(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: JwtPayload
) {
  return this.appointmentsService.findOneByUser(id, user.sub);
}

@Get('admin/all')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
findAllForAdmin() {
  return this.appointmentsService.findAllForAdmin();
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

@Patch(':id/cancel')
@UseGuards(JwtAuthGuard)
cancel(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: JwtPayload,
) {
  return this.appointmentsService.cancel(
    id,
    user.sub,
  );
}

@Patch(':id/confirm')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
confirm(
  @Param('id', ParseIntPipe) id: number,
) {
  return this.appointmentsService.confirm(id);
}

@Patch(':id/complete')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
complete(
  @Param('id', ParseIntPipe) id: number,
) {
  return this.appointmentsService.complete(id);
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