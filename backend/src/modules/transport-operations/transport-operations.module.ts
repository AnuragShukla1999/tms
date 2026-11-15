
import { Module } from '@nestjs/common';

// import { PrismaModule } from '../../prisma/prisma.module.js';
import { TransportOperationsController } from './transport-operations.controller.js';
import { TransportOperationsService } from './transport-operations.service.js';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TransportOperationsController],
  providers: [TransportOperationsService],
  exports: [TransportOperationsService],
})
export class TransportOperationsModule {}
