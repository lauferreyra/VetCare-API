import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Role } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';

import { CreateClinicalRecordDto } from './dto/create-clinical-record.dto.js';
import { UpdateClinicalRecordDto } from './dto/update-clinical-record.dto.js';

@Injectable()
export class ClinicalRecordsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async findByPet(
    petId: number,
    user: JwtPayload,
  ) {
    const pet = await this.prisma.pet.findFirst({
      where:
        user.role === Role.ADMIN
          ? {
              id: petId,
            }
          : {
              id: petId,
              ownerId: user.sub,
            },
    });

    if (!pet) {
      throw new NotFoundException(
        'Mascota no encontrada',
      );
    }

    return this.prisma.clinicalRecord.findMany({
      where: {
        petId,
      },
      orderBy: {
        date: 'desc',
      },
    });
  }

  async findOne(
    id: number,
    user: JwtPayload,
  ) {
    const record =
      await this.prisma.clinicalRecord.findFirst({
        where: {
          id,
          ...(user.role === Role.USER
            ? {
                pet: {
                  ownerId: user.sub,
                },
              }
            : {}),
        },
        include: {
          pet: true,
        },
      });

    if (!record) {
      throw new NotFoundException(
        'Historia clínica no encontrada',
      );
    }

    return record;
  }

  async create(dto: CreateClinicalRecordDto) {
    const pet = await this.prisma.pet.findUnique({
      where: {
        id: dto.petId,
      },
    });

    if (!pet) {
      throw new NotFoundException(
        'Mascota no encontrada',
      );
    }

    return this.prisma.clinicalRecord.create({
      data: {
        petId: dto.petId,
        date: dto.date
          ? new Date(dto.date)
          : new Date(),
        reason: dto.reason,
        diagnosis: dto.diagnosis,
        treatment: dto.treatment,
        observations: dto.observations,
        weight: dto.weight,
      },
      include: {
        pet: true,
      },
    });
  }

  async update(
    id: number,
    dto: UpdateClinicalRecordDto,
  ) {
    const record =
      await this.prisma.clinicalRecord.findUnique({
        where: {
          id,
        },
      });

    if (!record) {
      throw new NotFoundException(
        'Historia clínica no encontrada',
      );
    }

    if (dto.petId) {
      const pet = await this.prisma.pet.findUnique({
        where: {
          id: dto.petId,
        },
      });

      if (!pet) {
        throw new NotFoundException(
          'Mascota no encontrada',
        );
      }
    }

    return this.prisma.clinicalRecord.update({
      where: {
        id,
      },
      data: {
        petId: dto.petId,
        date: dto.date
          ? new Date(dto.date)
          : undefined,
        reason: dto.reason,
        diagnosis: dto.diagnosis,
        treatment: dto.treatment,
        observations: dto.observations,
        weight: dto.weight,
      },
      include: {
        pet: true,
      },
    });
  }
}