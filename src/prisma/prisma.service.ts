import { Injectable } from '@nestjs/common';
import { PrismaClient } from './../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    const connectionUrl = process.env.DATABASE_URL || '';

    if (connectionUrl.includes('tidbcloud.com') || connectionUrl.includes(':4000')) {
      const dbUrl = new URL(connectionUrl);
      const adapter = new PrismaMariaDb({
        host: dbUrl.hostname,
        port: dbUrl.port ? parseInt(dbUrl.port, 10) : 4000,
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        database: dbUrl.pathname.replace(/^\//, ''),
        ssl: {
          minVersion: 'TLSv1.2',
          rejectUnauthorized: false,
        },
        connectTimeout: 30000,
      });
      super({ adapter });
    } else if (connectionUrl.startsWith('mysql://')) {
      const dbUrl = new URL(connectionUrl);
      const adapter = new PrismaMariaDb({
        host: dbUrl.hostname,
        port: dbUrl.port ? parseInt(dbUrl.port, 10) : 3306,
        user: decodeURIComponent(dbUrl.username),
        password: decodeURIComponent(dbUrl.password),
        database: dbUrl.pathname.replace(/^\//, ''),
      });
      super({ adapter });
    } else {
      const adapter = new PrismaMariaDb(connectionUrl);
      super({ adapter });
    }
  }
}
