import { Injectable } from '@nestjs/common';
import { PrismaClient } from './../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb'; // 1. Đổi thư viện adapter

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const dbUrl = new URL(process.env.DATABASE_URL || '');

    const adapter = new PrismaMariaDb({
      host: dbUrl.hostname,
      port: dbUrl.port ? parseInt(dbUrl.port, 10) : 3306,
      user: dbUrl.username,
      password: decodeURIComponent(dbUrl.password),
      database: dbUrl.pathname.substring(1),
    });

    super({ adapter });
  }
}
