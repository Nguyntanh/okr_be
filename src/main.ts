import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformBigIntInterceptor } from './common/interceptors/transform-bigint.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());

  // Đăng ký Interceptor chuyển đổi BigInt sang chuỗi cho toàn bộ các API
  app.useGlobalInterceptors(new TransformBigIntInterceptor());

  app.enableCors({
    origin:
      process.env.FRONTEND_URL ??
      'http://localhost:5173' ??
      'https://okr-fe-delta.vercel.app',
    credentials: true,
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

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
