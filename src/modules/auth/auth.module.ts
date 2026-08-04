import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PrismaModule } from '../../prisma/prisma.module';

/**
 * AuthModule là module quản lý tất cả các vấn đề liên quan đến xác thực.
 * Nó import các module cần thiết, đăng ký các provider và controller.
 */
@Module({
  imports: [
    // Import UsersModule để có thể sử dụng UsersService trong AuthService.
    UsersModule,
    // Import PrismaModule để AuthService có thể tương tác với cơ sở dữ liệu.
    PrismaModule,
    // Cấu hình JwtModule một cách bất đồng bộ.
    JwtModule.registerAsync({
      // `global: true` giúp JwtService có thể được inject ở bất kỳ đâu trong ứng dụng
      // mà không cần phải import JwtModule ở các module khác.
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      // useFactory cho phép tạo cấu hình JWT một cách linh hoạt,
      // ở đây là đọc secret key và thời hạn token từ biến môi trường.
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '60s' },
      }),
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
})
export class AuthModule {}
