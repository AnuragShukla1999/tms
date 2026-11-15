import { Module } from '@nestjs/common';

import { PricingController } from './pricing.controller.js';
import { PricingService } from './pricing.service.js';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

// import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [PricingService],
})
export class PricingModule {}