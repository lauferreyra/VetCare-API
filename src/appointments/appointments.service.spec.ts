import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppointmentStatus } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AppointmentsService } from './appointments.service.js';

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  const appointmentMock = {
    id: 1,
    reason: 'Control general',
    petId: 10,
    slotId: 20,
    date: new Date('2026-09-01T13:00:00.000Z'),
    status: AppointmentStatus.PENDING,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const petMock = {
    id: 10,
    name: 'Firulais',
    species: 'Perro',
    breed: 'Labrador',
    ownerId: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const prismaMock = {
    appointment: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },

    pet: {
      findFirst: vi.fn(),
    },

    appointmentSlot: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },

    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        providers: [
          AppointmentsService,
          {
            provide: PrismaService,
            useValue: prismaMock,
          },
        ],
      }).compile();

    service = module.get<AppointmentsService>(
      AppointmentsService,
    );
  });

  describe('findOne', () => {
    it('debe devolver un turno cuando existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        appointmentMock,
      );

      const result = await service.findOne(1);

      expect(result).toEqual(appointmentMock);

      expect(
        prismaMock.appointment.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        include: {
          pet: {
            include: {
              owner: true,
            },
          },
        },
      });
    });

    it('debe lanzar NotFoundException cuando el turno no existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.findOne(999),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAllByUser', () => {
    it('debe buscar únicamente turnos pertenecientes al usuario', async () => {
      prismaMock.appointment.findMany.mockResolvedValue(
        [appointmentMock],
      );

      await service.findAllByUser(5);

      expect(
        prismaMock.appointment.findMany,
      ).toHaveBeenCalledWith({
        where: {
          pet: {
            ownerId: 5,
          },
        },
        include: {
          pet: true,
          slot: true,
        },
      });
    });
  });

  describe('findOneByUser', () => {
    it('debe devolver el turno cuando pertenece al usuario', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        appointmentMock,
      );

      const result =
        await service.findOneByUser(1, 5);

      expect(result).toEqual(appointmentMock);

      expect(
        prismaMock.appointment.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
          pet: {
            ownerId: 5,
          },
        },
        include: {
          pet: true,
        },
      });
    });

    it('debe lanzar 404 si el turno no pertenece al usuario', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.findOneByUser(1, 999),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const dto = {
      petId: 10,
      slotId: 20,
      reason: 'Control general',
    };

    it('debe lanzar 404 si la mascota no pertenece al usuario', async () => {
      prismaMock.pet.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.create(dto, 5),
      ).rejects.toThrow(NotFoundException);

      expect(
        prismaMock.$transaction,
      ).not.toHaveBeenCalled();
    });

    it('debe crear un turno PENDING cuando el slot está disponible', async () => {
      prismaMock.pet.findFirst.mockResolvedValue(
        petMock,
      );

      const futureDate = new Date(
        Date.now() + 60 * 60 * 1000,
      );

      const createdAppointment = {
        ...appointmentMock,
        date: futureDate,
      };

      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: 20,
            startTime: futureDate,
          },
        ]),

        appointment: {
          findFirst: vi
            .fn()
            .mockResolvedValue(null),

          create: vi
            .fn()
            .mockResolvedValue(
              createdAppointment,
            ),
        },
      };

      prismaMock.$transaction.mockImplementation(
        async (callback) => callback(tx),
      );

      const result = await service.create(
        dto,
        5,
      );

      expect(result).toEqual(
        createdAppointment,
      );

      expect(
        tx.appointment.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          slotId: 20,
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.CONFIRMED,
            ],
          },
        },
      });

      expect(
        tx.appointment.create,
      ).toHaveBeenCalledWith({
        data: {
          reason: 'Control general',
          petId: 10,
          slotId: 20,
          status:
            AppointmentStatus.PENDING,
          date: futureDate,
        },
        include: {
          pet: true,
          slot: true,
        },
      });
    });

    it('debe rechazar un slot inexistente', async () => {
      prismaMock.pet.findFirst.mockResolvedValue(
        petMock,
      );

      const tx = {
        $queryRaw: vi
          .fn()
          .mockResolvedValue([]),

        appointment: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
      };

      prismaMock.$transaction.mockImplementation(
        async (callback) => callback(tx),
      );

      await expect(
        service.create(dto, 5),
      ).rejects.toThrow(NotFoundException);

      expect(
        tx.appointment.create,
      ).not.toHaveBeenCalled();
    });

    it('debe rechazar un horario pasado', async () => {
      prismaMock.pet.findFirst.mockResolvedValue(
        petMock,
      );

      const pastDate = new Date(
        Date.now() - 60 * 60 * 1000,
      );

      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: 20,
            startTime: pastDate,
          },
        ]),

        appointment: {
          findFirst: vi.fn(),
          create: vi.fn(),
        },
      };

      prismaMock.$transaction.mockImplementation(
        async (callback) => callback(tx),
      );

      await expect(
        service.create(dto, 5),
      ).rejects.toThrow(
        BadRequestException,
      );

      expect(
        tx.appointment.create,
      ).not.toHaveBeenCalled();
    });

    it('debe rechazar un slot ocupado por un turno PENDING o CONFIRMED', async () => {
      prismaMock.pet.findFirst.mockResolvedValue(
        petMock,
      );

      const futureDate = new Date(
        Date.now() + 60 * 60 * 1000,
      );

      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: 20,
            startTime: futureDate,
          },
        ]),

        appointment: {
          findFirst: vi
            .fn()
            .mockResolvedValue(
              appointmentMock,
            ),

          create: vi.fn(),
        },
      };

      prismaMock.$transaction.mockImplementation(
        async (callback) => callback(tx),
      );

      await expect(
        service.create(dto, 5),
      ).rejects.toThrow(
        ConflictException,
      );

      expect(
        tx.appointment.create,
      ).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('debe rechazar la modificación de un turno COMPLETED', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.COMPLETED,
        },
      );

      await expect(
        service.update(
          1,
          {
            reason: 'Nuevo motivo',
          },
          5,
        ),
      ).rejects.toThrow(
        ConflictException,
      );

      expect(
        prismaMock.appointment.update,
      ).not.toHaveBeenCalled();
    });

    it('debe rechazar la modificación de un turno CANCELLED', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.CANCELLED,
        },
      );

      await expect(
        service.update(
          1,
          {
            reason: 'Nuevo motivo',
          },
          5,
        ),
      ).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe actualizar sin transacción cuando no cambia el slot', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        appointmentMock,
      );

      prismaMock.appointment.update.mockResolvedValue(
        {
          ...appointmentMock,
          reason: 'Vacunación',
        },
      );

      await service.update(
        1,
        {
          reason: 'Vacunación',
        },
        5,
      );

      expect(
        prismaMock.$transaction,
      ).not.toHaveBeenCalled();

      expect(
        prismaMock.appointment.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          reason: 'Vacunación',
          petId: undefined,
        },
        include: {
          pet: true,
          slot: true,
        },
      });
    });

    it('debe rechazar la actualización si el turno no pertenece al usuario', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.update(
          1,
          {
            reason: 'Vacunación',
          },
          999,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar la actualización si la nueva mascota no pertenece al usuario', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        appointmentMock,
      );

      prismaMock.pet.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.update(
          1,
          {
            petId: 99,
            reason: 'Vacunación',
          },
          5,
        ),
      ).rejects.toThrow(NotFoundException);

      expect(
        prismaMock.appointment.update,
      ).not.toHaveBeenCalled();
    });

    it('debe actualizar usando transacción cuando cambia de slot', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        appointmentMock,
      );

      const futureDate = new Date(
        Date.now() + 60 * 60 * 1000,
      );

      const updatedAppointment = {
        ...appointmentMock,
        slotId: 30,
        date: futureDate,
      };

      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: 30,
            startTime: futureDate,
          },
        ]),

        appointment: {
          findFirst: vi
            .fn()
            .mockResolvedValue(null),

          update: vi
            .fn()
            .mockResolvedValue(
              updatedAppointment,
            ),
        },
      };

      prismaMock.$transaction.mockImplementation(
        async (callback) => callback(tx),
      );

      const result = await service.update(
        1,
        {
          slotId: 30,
          reason: 'Control nuevo',
        },
        5,
      );

      expect(result).toEqual(
        updatedAppointment,
      );

      expect(
        tx.appointment.findFirst,
      ).toHaveBeenCalledWith({
        where: {
          slotId: 30,
          id: {
            not: 1,
          },
          status: {
            in: [
              AppointmentStatus.PENDING,
              AppointmentStatus.CONFIRMED,
            ],
          },
        },
      });

      expect(
        tx.appointment.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          reason: 'Control nuevo',
          petId: undefined,
          slotId: 30,
          date: futureDate,
        },
        include: {
          pet: true,
          slot: true,
        },
      });
    });

    it('debe rechazar el cambio a un slot ocupado', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        appointmentMock,
      );

      const futureDate = new Date(
        Date.now() + 60 * 60 * 1000,
      );

      const tx = {
        $queryRaw: vi.fn().mockResolvedValue([
          {
            id: 30,
            startTime: futureDate,
          },
        ]),

        appointment: {
          findFirst: vi
            .fn()
            .mockResolvedValue({
              ...appointmentMock,
              id: 2,
            }),

          update: vi.fn(),
        },
      };

      prismaMock.$transaction.mockImplementation(
        async (callback) => callback(tx),
      );

      await expect(
        service.update(
          1,
          {
            slotId: 30,
            reason: 'Control nuevo',
          },
          5,
        ),
      ).rejects.toThrow(
        ConflictException,
      );

      expect(
        tx.appointment.update,
      ).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('debe eliminar el turno si pertenece al usuario', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        appointmentMock,
      );

      prismaMock.appointment.delete.mockResolvedValue(
        appointmentMock,
      );

      const result = await service.remove(
        1,
        5,
      );

      expect(result).toEqual(
        appointmentMock,
      );

      expect(
        prismaMock.appointment.delete,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
      });
    });

    it('debe lanzar 404 si el turno no pertenece al usuario', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.remove(1, 999),
      ).rejects.toThrow(NotFoundException);

      expect(
        prismaMock.appointment.delete,
      ).not.toHaveBeenCalled();
    });
  });

  describe('cancel', () => {
    it('debe cancelar un turno PENDING', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        appointmentMock,
      );

      prismaMock.appointment.update.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.CANCELLED,
        },
      );

      const result = await service.cancel(
        1,
        5,
      );

      expect(result.status).toBe(
        AppointmentStatus.CANCELLED,
      );

      expect(
        prismaMock.appointment.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          status:
            AppointmentStatus.CANCELLED,
        },
        include: {
          pet: true,
          slot: true,
        },
      });
    });

    it('debe lanzar 404 si el turno no pertenece al usuario', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        null,
      );

      await expect(
        service.cancel(1, 999),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar la cancelación de un turno COMPLETED', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.COMPLETED,
        },
      );

      await expect(
        service.cancel(1, 5),
      ).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe rechazar la cancelación de un turno ya CANCELLED', async () => {
      prismaMock.appointment.findFirst.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.CANCELLED,
        },
      );

      await expect(
        service.cancel(1, 5),
      ).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('confirm', () => {
    it('debe cambiar PENDING a CONFIRMED', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        appointmentMock,
      );

      prismaMock.appointment.update.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.CONFIRMED,
        },
      );

      const result =
        await service.confirm(1);

      expect(result.status).toBe(
        AppointmentStatus.CONFIRMED,
      );

      expect(
        prismaMock.appointment.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          status:
            AppointmentStatus.CONFIRMED,
        },
        include: {
          pet: true,
          slot: true,
        },
      });
    });

    it('debe lanzar 404 si el turno no existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.confirm(999),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar un turno que no está PENDING', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.CONFIRMED,
        },
      );

      await expect(
        service.confirm(1),
      ).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('complete', () => {
    it('debe cambiar CONFIRMED a COMPLETED si el turno ya ocurrió', async () => {
      const pastDate = new Date(
        Date.now() - 60 * 60 * 1000,
      );

      prismaMock.appointment.findUnique.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.CONFIRMED,
          slot: {
            id: 20,
            startTime: pastDate,
          },
        },
      );

      prismaMock.appointment.update.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.COMPLETED,
        },
      );

      const result =
        await service.complete(1);

      expect(result.status).toBe(
        AppointmentStatus.COMPLETED,
      );

      expect(
        prismaMock.appointment.update,
      ).toHaveBeenCalledWith({
        where: {
          id: 1,
        },
        data: {
          status:
            AppointmentStatus.COMPLETED,
        },
        include: {
          pet: true,
          slot: true,
        },
      });
    });

    it('debe lanzar 404 si el turno no existe', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.complete(999),
      ).rejects.toThrow(NotFoundException);
    });

    it('debe rechazar completar un turno PENDING', async () => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.PENDING,
          slot: null,
        },
      );

      await expect(
        service.complete(1),
      ).rejects.toThrow(
        ConflictException,
      );
    });

    it('debe rechazar completar un turno futuro', async () => {
      const futureDate = new Date(
        Date.now() + 60 * 60 * 1000,
      );

      prismaMock.appointment.findUnique.mockResolvedValue(
        {
          ...appointmentMock,
          status:
            AppointmentStatus.CONFIRMED,
          slot: {
            id: 20,
            startTime: futureDate,
          },
        },
      );

      await expect(
        service.complete(1),
      ).rejects.toThrow(
        ConflictException,
      );

      expect(
        prismaMock.appointment.update,
      ).not.toHaveBeenCalled();
    });
  });
});