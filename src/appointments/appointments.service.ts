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

  async create(dto: CreateAppointmentDto) {
    const pet = await this.prisma.pet.findUnique({
      where: {
        id: dto.petId,
      },
    });

    if (!pet) {
      throw new NotFoundException('La mascota no existe');
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

  async update(id: number, dto: UpdateAppointmentDto) {
    await this.findOne(id);

    if (dto.petId !== undefined) {
      const pet = await this.prisma.pet.findUnique({
        where: {
          id: dto.petId,
        },
      });

      if (!pet) {
        throw new NotFoundException('La mascota no existe');
      }
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        date: dto.date ? new Date(dto.date) : undefined,
        reason: dto.reason,
        petId: dto.petId,
        status: dto.status,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.appointment.delete({
      where: { id },
    });
  }
}