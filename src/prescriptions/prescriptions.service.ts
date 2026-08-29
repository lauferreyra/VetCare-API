import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  PrescriptionStatus,
  Role,
} from '../generated/prisma/client.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { CreatePrescriptionDto } from './dto/create-prescription.dto.js';
import { UpdatePrescriptionDto } from './dto/update-prescription.dto.js';

@Injectable()
export class PrescriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findByPet(
    petId: number,
    user: JwtPayload,
  ) {
    const pet = await this.prisma.pet.findFirst({
      where:
        user.role === Role.ADMIN
          ? { id: petId }
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

    return this.prisma.prescription.findMany({
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
    const prescription =
      await this.prisma.prescription.findFirst({
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

    if (!prescription) {
      throw new NotFoundException(
        'Receta no encontrada',
      );
    }

    return prescription;
  }

  async create(dto: CreatePrescriptionDto) {
    const pet =
      await this.prisma.pet.findUnique({
        where: {
          id: dto.petId,
        },
      });

    if (!pet) {
      throw new NotFoundException(
        'Mascota no encontrada',
      );
    }

    return this.prisma.prescription.create({
      data: {
        petId: dto.petId,
        date: dto.date
          ? new Date(dto.date)
          : new Date(),
        medication: dto.medication,
        dosage: dto.dosage,
        instructions: dto.instructions,
      },
      include: {
        pet: true,
      },
    });
  }

  async update(
    id: number,
    dto: UpdatePrescriptionDto,
  ) {
    const prescription =
      await this.prisma.prescription.findUnique({
        where: {
          id,
        },
      });

    if (!prescription) {
      throw new NotFoundException(
        'Receta no encontrada',
      );
    }

    return this.prisma.prescription.update({
      where: {
        id,
      },
      data: {
        date: dto.date
          ? new Date(dto.date)
          : undefined,
        medication: dto.medication,
        dosage: dto.dosage,
        instructions: dto.instructions,
      },
      include: {
        pet: true,
      },
    });
  }

  async cancel(id: number) {
    const prescription =
      await this.prisma.prescription.findUnique({
        where: {
          id,
        },
      });

    if (!prescription) {
      throw new NotFoundException(
        'Receta no encontrada',
      );
    }

    return this.prisma.prescription.update({
      where: {
        id,
      },
      data: {
        status: PrescriptionStatus.CANCELLED,
      },
      include: {
        pet: true,
      },
    });
  }
}