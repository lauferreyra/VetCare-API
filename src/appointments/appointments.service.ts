import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  AppointmentStatus,
} from '../generated/prisma/client.js';
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
      slot: true,
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

  return this.prisma.$transaction(async (tx) => {
    const slots = await tx.$queryRaw<
      {
        id: number;
        startTime: Date;
      }[]
    >`
      SELECT id, "startTime"
      FROM "AppointmentSlot"
      WHERE id = ${dto.slotId}
      FOR UPDATE
    `;

    const slot = slots[0];

    if (!slot) {
      throw new NotFoundException(
        'Horario no encontrado',
      );
    }

    if (slot.startTime <= new Date()) {
      throw new BadRequestException(
        'No se pueden reservar horarios pasados',
      );
    }

    const existingAppointment =
      await tx.appointment.findFirst({
        where: {
          slotId: dto.slotId,
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.CONFIRMED,
            ],
          },
        },
      });

    if (existingAppointment) {
      throw new ConflictException(
        'El horario seleccionado ya está ocupado',
      );
    }

    return tx.appointment.create({
      data: {
        reason: dto.reason,
        petId: dto.petId,
        slotId: dto.slotId,
        status: AppointmentStatus.PENDING,

        // temporal mientras seguimos con la migración
        date: slot.startTime,
      },
      include: {
        pet: true,
        slot: true,
      },
    });
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
    throw new NotFoundException('Turno no encontrado');
  }

  if (
    appointment.status === AppointmentStatus.COMPLETED ||
    appointment.status === AppointmentStatus.CANCELLED
  ) {
    throw new ConflictException(
      'No se puede modificar un turno completado o cancelado',
    );
  }

  if (dto.petId) {
    const pet = await this.prisma.pet.findFirst({
      where: {
        id: dto.petId,
        ownerId: userId,
      },
    });

    if (!pet) {
      throw new NotFoundException('Mascota no encontrada');
    }
  }

  // Si no cambia el horario, no necesitamos lockear otro slot.
  if (!dto.slotId || dto.slotId === appointment.slotId) {
    return this.prisma.appointment.update({
      where: {
        id,
      },
      data: {
        reason: dto.reason,
        petId: dto.petId,
      },
      include: {
        pet: true,
        slot: true,
      },
    });
  }

  // Si cambia de horario, aplicamos pessimistic locking.
  return this.prisma.$transaction(async (tx) => {
    const slots = await tx.$queryRaw<
      {
        id: number;
        startTime: Date;
      }[]
    >`
      SELECT id, "startTime"
      FROM "AppointmentSlot"
      WHERE id = ${dto.slotId}
      FOR UPDATE
    `;

    const slot = slots[0];

    if (!slot) {
      throw new NotFoundException(
        'Horario no encontrado',
      );
    }

    if (slot.startTime <= new Date()) {
      throw new BadRequestException(
        'No se puede mover el turno a un horario pasado',
      );
    }

    const occupied =
      await tx.appointment.findFirst({
        where: {
          slotId: dto.slotId,
          id: {
            not: id,
          },
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.CONFIRMED,
            ],
          },
        },
      });

    if (occupied) {
      throw new ConflictException(
        'El horario seleccionado ya está ocupado',
      );
    }

    return tx.appointment.update({
      where: {
        id,
      },
      data: {
        reason: dto.reason,
        petId: dto.petId,
        slotId: dto.slotId,

        // temporal mientras todavía exista Appointment.date
        date: slot.startTime,
      },
      include: {
        pet: true,
        slot: true,
      },
    });
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

async getAvailability(date: string) {
  const selectedDate = new Date(`${date}T00:00:00-03:00`);

  const dayOfWeek = selectedDate.getDay();

 // if (dayOfWeek === 0 || dayOfWeek === 6) {
  //  throw new BadRequestException(
  //    'La veterinaria atiende únicamente de lunes a viernes',
 //   );
 // }

  const now = new Date();

  if (selectedDate < new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  )) {
    throw new BadRequestException(
      'No se pueden consultar turnos para fechas pasadas',
    );
  }

  const slots: Date[] = [];

  for (let hour = 9; hour < 21; hour++) {
    slots.push(
      new Date(
        `${date}T${String(hour).padStart(2, '0')}:00:00-03:00`,
      ),
    );

    slots.push(
      new Date(
        `${date}T${String(hour).padStart(2, '0')}:30:00-03:00`,
      ),
    );
  }

  await this.prisma.appointmentSlot.createMany({
    data: slots.map((startTime) => ({
      startTime,
    })),
    skipDuplicates: true,
  });

  const storedSlots =
    await this.prisma.appointmentSlot.findMany({
      where: {
        startTime: {
          in: slots,
        },
      },
      include: {
        appointments: {
          where: {
            status: {
              in: ['PENDING', 'CONFIRMED'],
            },
          },
        },
      },
      orderBy: {
        startTime: 'asc',
      },
    });

  return {
    date,
    slots: storedSlots.map((slot) => ({
      id: slot.id,
      startTime: slot.startTime,
      time: slot.startTime.toLocaleTimeString(
        'es-AR',
        {
          timeZone: 'America/Argentina/Buenos_Aires',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        },
      ),
      available: slot.appointments.length === 0,
    })),
  };
}

async cancel(id: number, userId: number) {
  const appointment =
    await this.prisma.appointment.findFirst({
      where: {
        id,
        pet: {
          ownerId: userId,
        },
      },
      include: {
        slot: true,
      },
    });

  if (!appointment) {
    throw new NotFoundException(
      'Turno no encontrado',
    );
  }

  if (
    appointment.status ===
    AppointmentStatus.COMPLETED
  ) {
    throw new ConflictException(
      'No se puede cancelar un turno completado',
    );
  }

  if (
    appointment.status ===
    AppointmentStatus.CANCELLED
  ) {
    throw new ConflictException(
      'El turno ya se encuentra cancelado',
    );
  }

  return this.prisma.appointment.update({
    where: {
      id,
    },
    data: {
      status: AppointmentStatus.CANCELLED,
    },
    include: {
      pet: true,
      slot: true,
    },
  });
}

async confirm(id: number) {
  const appointment =
    await this.prisma.appointment.findUnique({
      where: { id },
    });

  if (!appointment) {
    throw new NotFoundException(
      'Turno no encontrado',
    );
  }

  if (
    appointment.status !==
    AppointmentStatus.PENDING
  ) {
    throw new ConflictException(
      'Solo se pueden confirmar turnos pendientes',
    );
  }

  return this.prisma.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.CONFIRMED,
    },
    include: {
      pet: true,
      slot: true,
    },
  });
}

async complete(id: number) {
  const appointment =
    await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        slot: true,
      },
    });

  if (!appointment) {
    throw new NotFoundException(
      'Turno no encontrado',
    );
  }

  if (
    appointment.status !==
    AppointmentStatus.CONFIRMED
  ) {
    throw new ConflictException(
      'Solo se pueden completar turnos confirmados',
    );
  }

  if (
    appointment.slot &&
    appointment.slot.startTime > new Date()
  ) {
    throw new ConflictException(
      'No se puede completar un turno que todavía no ocurrió',
    );
  }

  return this.prisma.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.COMPLETED,
    },
    include: {
      pet: true,
      slot: true,
    },
  });
}

}