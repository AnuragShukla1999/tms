import { Module } from '@nestjs/common';

import { FleetOperationsController } from './fleet-operations.controller.js';
import { FleetOperationsService } from './fleet-operations.service.js';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

// import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FleetOperationsController],
  providers: [FleetOperationsService],
  exports: [FleetOperationsService],
})
export class FleetOperationsModule {}