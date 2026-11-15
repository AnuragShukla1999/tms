import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { DriverTransactionsService } from './driver-transactions.service.js';
import { getContext } from './finance.utils.js';
import {
  CreateDriverTransactionDto,
  DriverSalarySummaryQueryDto,
  QueryDriverTransactionDto,
} from './dto/driver-transaction.dto.js';

@Controller('driver-transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class DriverTransactionsController {
  constructor(private readonly service: DriverTransactionsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateDriverTransactionDto) {
    const { companyId } = getContext(req);
    return this.service.create(companyId, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: QueryDriverTransactionDto) {
    const { companyId } = getContext(req);
    return this.service.findAll(companyId, query);
  }

  @Get('salary-summary/:driverId')
  salarySummary(
    @Req() req: any,
    @Param('driverId') driverId: string,
    @Query() query: DriverSalarySummaryQueryDto,
  ) {
    const { companyId } = getContext(req);
    return this.service.getSalarySummary(companyId, driverId, query.month);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.findOne(companyId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.remove(companyId, id);
  }
}
