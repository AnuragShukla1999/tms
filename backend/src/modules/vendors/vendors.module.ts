
import { Module } from '@nestjs/common';

import { VendorsController } from './vendors.controller.js';
import { VendorsService } from './vendors.service.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [VendorsController],
  providers: [VendorsService],
  exports: [VendorsService],
})
export class VendorsModule {}
