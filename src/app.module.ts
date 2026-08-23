import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { PermissionsModule } from './modules/permissions/permissions.module';
import { DepartmentsModule } from './modules/departments/departments.module';
import { CyclesModule } from './modules/cycles/cycles.module';
import { ObjectivesModule } from './modules/objectives/objectives.module';
import { CheckInsModule } from './modules/check-ins/check-ins.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    DepartmentsModule,
    CyclesModule,
    ObjectivesModule,
    CheckInsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
