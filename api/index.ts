import { NestFactory } from '@nestjs/core';
import { AppModule } from '../src/app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformBigIntInterceptor } from '../src/common/interceptors/transform-bigint.interceptor';
import { ExpressAdapter } from '@nestjs/platform-express';
import express, { Express, Request, Response } from 'express';

const server: Express = express();

let isReady = false;

async function createNestServer(expressInstance: Express) {
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressInstance),
  );

  app.use(cookieParser());
  app.useGlobalInterceptors(new TransformBigIntInterceptor());

  app.enableCors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (curl, mobile app, postman, server-to-server)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:4173',
        'https://okr-fe-delta.vercel.app',
      ];

      if (process.env.FRONTEND_URL) {
        const envOrigins = process.env.FRONTEND_URL.split(',').map((u) =>
          u.trim(),
        );
        allowedOrigins.push(...envOrigins);
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        process.env.NODE_ENV !== 'production';

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`Blocked by CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Accept',
      'Authorization',
      'Cookie',
      'X-Requested-With',
    ],
    exposedHeaders: ['Set-Cookie'],
  });

  const config = new DocumentBuilder()
    .setTitle('Dự án OKR API')
    .setDescription(
      'Danh sách và tài liệu các API hệ thống OKRs - Bao gồm Xác thực, Phân quyền động, Quản lý OKR',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('swagger', app, document);

  await app.init();
}

export default async function handler(req: Request, res: Response) {
  if (!isReady) {
    await createNestServer(server);
    isReady = true;
  }
  server(req, res);
}
