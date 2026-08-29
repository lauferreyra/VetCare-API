import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        email: dto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('El email ya está registrado');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
      omit: {
        password: true,
      },
    });
  }

  findAll() {
    return this.prisma.user.findMany({
      omit: {
        password: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: {
        id,
      },
      omit: {
        password: true,
      },
    });

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);

    if (dto.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: {
          email: dto.email,
        },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('El email ya está registrado');
      }
    }

    let hashedPassword: string | undefined;

    if (dto.password) {
      hashedPassword = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: {
        id,
      },
      data: {
        name: dto.name,
        email: dto.email,
        password: hashedPassword,
      },
      omit: {
        password: true,
      },
    });
  }

  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: {
        id,
      },
      omit: {
        password: true,
      },
    });
  }
}