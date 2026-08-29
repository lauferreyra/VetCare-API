import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';

@Injectable()
export class PetsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.pet.findMany({
      include: {
        owner: true,
      },
    });
  }

  findAllByUser(userId: number) {
  return this.prisma.pet.findMany({
    where: {
      ownerId: userId,
    },
    include: {
      appointments: true,
    },
  });
}

  async findOne(id: number) {
    const pet = await this.prisma.pet.findUnique({
      where: { id },
      include: {
        owner: true,
      },
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }

    return pet;
  }

  async findOneByUser(id: number, userId: number) {
  const pet = await this.prisma.pet.findFirst({
    where: {
      id,
      ownerId: userId,
    },
    include: {
      appointments: true,
    },
  });

  if (!pet) {
    throw new NotFoundException('Mascota no encontrada');
  }

  return pet;
}

  async create(dto: CreatePetDto, userId: number) {
    const owner = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!owner) {
      throw new NotFoundException('El usuario propietario no existe');
    }

    return this.prisma.pet.create({
      data: {
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        ownerId: userId,
      },
    });
  }

  async update(id: number, dto: UpdatePetDto, userId: number) {
    await this.findOne(id);

    if (userId !== undefined) {
      const owner = await this.prisma.user.findUnique({
        where: {
          id: userId,
        },
      });

      if (!owner) {
        throw new NotFoundException('El usuario propietario no existe');
      }
    }

    return this.prisma.pet.update({
      where: { id },
      data: {
        name: dto.name,
        species: dto.species,
        breed: dto.breed,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        ownerId: userId,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.pet.delete({
      where: { id },
    });
  }
}