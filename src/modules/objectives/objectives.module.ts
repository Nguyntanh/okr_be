import { Module } from '@nestjs/common';
import { ObjectivesService } from './objectives.service';
import { ObjectivesController } from './objectives.controller';
import { KeyResultsService } from './key-results.service';
import { KeyResultsController } from './key-results.controller';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ObjectivesController, KeyResultsController],
  providers: [ObjectivesService, KeyResultsService],
  exports: [ObjectivesService, KeyResultsService],
})
export class ObjectivesModule {}
