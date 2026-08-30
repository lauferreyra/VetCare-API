import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreatePetDto } from './dto/create-pet.dto.js';
import { UpdatePetDto } from './dto/update-pet.dto.js';
import { Prisma } from "../generated/prisma/client.js";

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

async findAllForAdmin() {
  return this.prisma.pet.findMany({
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
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
  const pet = await this.prisma.pet.findFirst({
    where: {
      id,
      ownerId: userId,
    },
  });

  if (!pet) {
    throw new NotFoundException("Mascota no encontrada");
  }

  return this.prisma.pet.update({
    where: { id },
    data: {
      name: dto.name,
      species: dto.species,
      breed: dto.breed,
      birthDate: dto.birthDate
        ? new Date(dto.birthDate)
        : undefined,
    },
  });
}

async remove(id: number, userId: number) {
  const pet = await this.prisma.pet.findFirst({
    where: {
      id,
      ownerId: userId,
    },
  });

  if (!pet) {
    throw new NotFoundException("Mascota no encontrada");
  }

  try {
    return await this.prisma.pet.delete({
      where: { id },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2003"
    ) {
      throw new ConflictException(
        "No se puede eliminar la mascota porque tiene turnos asociados",
      );
    }

    throw error;
  }
}
}