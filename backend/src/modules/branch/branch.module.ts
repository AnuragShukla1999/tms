
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../database/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { BranchController } from './branch.controller.js';
import { BranchService } from './branch.service.js';


@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  controllers: [BranchController],
  providers: [BranchService],
  exports: [BranchService],
})
export class BranchModule {}
