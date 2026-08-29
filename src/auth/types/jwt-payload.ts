import { Role } from '../../generated/prisma/client.js';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}