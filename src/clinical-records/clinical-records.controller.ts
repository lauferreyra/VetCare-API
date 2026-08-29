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

import { Role } from '../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';

import { ClinicalRecordsService } from './clinical-records.service.js';
import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto.js';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto.js';

@Controller('clinical-records')
export class ClinicalRecordsController {
  constructor(
    private readonly clinicalRecordsService: ClinicalRecordsService,
  ) {}

  @Get('pet/:petId')
  @UseGuards(JwtAuthGuard)
  findByPet(
    @Param('petId', ParseIntPipe) petId: number,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.clinicalRecordsService.findByPet(
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
    return this.clinicalRecordsService.findOne(
      id,
      user,
    );
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  create(
    @Body() dto: CreateClinicalRecordDto,
  ) {
    return this.clinicalRecordsService.create(
      dto,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateClinicalRecordDto,
  ) {
    return this.clinicalRecordsService.update(
      id,
      dto,
    );
  }
}