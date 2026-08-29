import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAppointmentDto } from './dto/create-appointment.dto.js';
import { UpdateAppointmentDto } from './dto/update-appointment.dto.js';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.appointment.findMany({
      include: {
        pet: {
          include: {
            owner: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });
  }

  async findOne(id: number) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        pet: {
          include: {
            owner: true,
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Turno no encontrado');
    }

    return appointment;
  }

  findAllByUser(userId: number) {
  return this.prisma.appointment.findMany({
    where: {
      pet: {
        ownerId: userId,
      },
    },
    include: {
      pet: true,
    },
    orderBy: {
      date: 'asc',
    },
  });
}

async findOneByUser(id: number, userId: number) {
  const appointment = await this.prisma.appointment.findFirst({
    where: {
      id,
      pet: {
        ownerId: userId,
      },
    },
    include: {
      pet: true,
    },
  });

  if (!appointment) {
    throw new NotFoundException('Turno no encontrado');
  }

  return appointment;
}

async create(dto: CreateAppointmentDto, userId: number) {
  const pet = await this.prisma.pet.findFirst({
    where: {
      id: dto.petId,
      ownerId: userId,
    },
  });

  if (!pet) {
    throw new NotFoundException('Mascota no encontrada');
  }

  return this.prisma.appointment.create({
    data: {
      date: new Date(dto.date),
      reason: dto.reason,
      petId: dto.petId,
      status: dto.status,
    },
  });
}

async update(
  id: number,
  dto: UpdateAppointmentDto,
  userId: number,
) {
  const appointment = await this.prisma.appointment.findFirst({
    where: {
      id,
      pet: {
        ownerId: userId,
      },
    },
  });

  if (!appointment) {
    throw new NotFoundException("Turno no encontrado");
  }

  if (dto.petId) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: dto.petId,
        ownerId: userId,
      },
    });

    if (!pet) {
      throw new NotFoundException("Mascota no encontrada");
    }
  }

  return this.prisma.appointment.update({
    where: {
      id,
    },
    data: {
      date: dto.date
        ? new Date(dto.date)
        : undefined,
      reason: dto.reason,
      petId: dto.petId,
      status: dto.status,
    },
  });
}

 async remove(id: number, userId: number) {
  const appointment = await this.prisma.appointment.findFirst({
    where: {
      id,
      pet: {
        ownerId: userId,
      },
    },
  });

  if (!appointment) {
    throw new NotFoundException("Turno no encontrado");
  }

  return this.prisma.appointment.delete({
    where: {
      id,
    },
  });
}
}