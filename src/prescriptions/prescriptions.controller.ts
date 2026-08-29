import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { Role } from '../generated/prisma/client.js';

import { CreatePrescriptionDto } from './dto/create-prescription.dto.js';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto.js';
import { PrescriptionsService } from './prescriptions.service.js';

@Controller('prescriptions')
export class PrescriptionsController {
  constructor(
    private readonly prescriptionsService:
      PrescriptionsService,
  ) {}

  @Get('pet/:petId')
  @UseGuards(JwtAuthGuard)
  findByPet(
    @Param('petId', ParseIntPipe)
    petId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prescriptionsService.findByPet(
      petId,
      user,
    );
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.prescriptionsService.findOne(
      id,
      user,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreatePrescriptionDto,
  ) {
    return this.prescriptionsService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePrescriptionDto,
  ) {
    return this.prescriptionsService.update(
      id,
      dto,
    );
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  cancel(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.prescriptionsService.cancel(id);
  }
}