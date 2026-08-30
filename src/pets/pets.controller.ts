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

import { CreatePetDto } from './dto/create-pet.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { PetsService } from './pets.service.js';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Role } from '../generated/prisma/client.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('Pets')
@ApiBearerAuth()
@Controller('pets')
export class PetsController {
  constructor(private readonly petsService: PetsService) {}

@Get()
@UseGuards(JwtAuthGuard)
findAll(
  @CurrentUser() user: JwtPayload
) {
  return this.petsService.findAllByUser(user.sub);
}

  @Get(':id')
@UseGuards(JwtAuthGuard)
findOne(
  @Param('id', ParseIntPipe) id: number,
  @CurrentUser() user: JwtPayload
) {
  return this.petsService.findOneByUser(id, user.sub);
}

@Get('admin/all')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
findAllForAdmin() {
  return this.petsService.findAllForAdmin();
}

  @Post()
  @UseGuards(JwtAuthGuard)
 create(
  @Body() dto: CreatePetDto,
  @CurrentUser() user: JwtPayload,
) {
  return this.petsService.create(dto, user.sub);
}

  @Patch(":id")
@UseGuards(JwtAuthGuard)
update(
  @Param("id", ParseIntPipe) id: number,
  @Body() dto: UpdatePetDto,
  @CurrentUser() user: JwtPayload,
) {
  return this.petsService.update(id, dto, user.sub);
}

@Delete(":id")
@UseGuards(JwtAuthGuard)
remove(
  @Param("id", ParseIntPipe) id: number,
  @CurrentUser() user: JwtPayload,
) {
  return this.petsService.remove(id, user.sub);
}
}