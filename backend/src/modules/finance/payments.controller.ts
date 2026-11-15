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

import { PaymentsService } from './payments.service.js';
import { getContext } from './finance.utils.js';
import {
  CreateCustomerPaymentDto,
  CreateVendorPaymentDto,
  QueryCustomerPaymentDto,
  QueryVendorPaymentDto,
} from './dto/payment.dto.js';

@Controller('customer-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class CustomerPaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateCustomerPaymentDto) {
    const { companyId, userId } = getContext(req);
    return this.service.createCustomerPayment(companyId, userId, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: QueryCustomerPaymentDto) {
    const { companyId } = getContext(req);
    return this.service.findAllCustomerPayments(companyId, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.findCustomerPayment(companyId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.deleteCustomerPayment(companyId, id);
  }
}

@Controller('vendor-payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class VendorPaymentsController {
  constructor(private readonly service: PaymentsService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateVendorPaymentDto) {
    const { companyId } = getContext(req);
    return this.service.createVendorPayment(companyId, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: QueryVendorPaymentDto) {
    const { companyId } = getContext(req);
    return this.service.findAllVendorPayments(companyId, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.findVendorPayment(companyId, id);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.deleteVendorPayment(companyId, id);
  }
}
