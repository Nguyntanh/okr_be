import { Injectable } from '@nestjs/common';
import { PrismaService } from './../../prisma/prisma.service';
import { User } from './../../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOne(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: {
        email: email,
      },
    });
  }
}
