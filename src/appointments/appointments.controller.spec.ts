import { Test, TestingModule } from '@nestjs/testing';
import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

import { AppointmentsController } from './appointments.controller.js';
import { AppointmentsService } from './appointments.service.js';
import type { JwtPayload } from '../auth/types/jwt-payload.js';
import { Role } from '../generated/prisma/client.js';

describe('AppointmentsController', () => {
  let controller: AppointmentsController;

  const appointmentsServiceMock = {
    findAllByUser: vi.fn(),
    getAvailability: vi.fn(),
    findOneByUser: vi.fn(),
    findAllForAdmin: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    cancel: vi.fn(),
    confirm: vi.fn(),
    complete: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule =
      await Test.createTestingModule({
        controllers: [
          AppointmentsController,
        ],
        providers: [
          {
            provide: AppointmentsService,
            useValue:
              appointmentsServiceMock,
          },
        ],
      }).compile();

    controller =
      module.get<AppointmentsController>(
        AppointmentsController,
      );
  });

  describe('findOne', () => {
    it('debe enviar el id y el userId al service', async () => {
      const user: JwtPayload = {
        sub: 5,
        email: 'user@test.com',
        role: Role.USER,
      };

      const appointmentMock = {
        id: 1,
        reason: 'Control general',
        petId: 10,
        slotId: 20,
      };

      appointmentsServiceMock
        .findOneByUser
        .mockResolvedValue(
          appointmentMock,
        );

      const result =
        await controller.findOne(
          1,
          user,
        );

      expect(
        appointmentsServiceMock.findOneByUser,
      ).toHaveBeenCalledWith(
        1,
        5,
      );

      expect(result).toEqual(
        appointmentMock,
      );
    });
  });
});