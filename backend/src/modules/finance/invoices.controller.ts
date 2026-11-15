import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { UserRole } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { InvoicesService } from './invoices.service.js';
import { getContext } from './finance.utils.js';
import {
  AddInvoiceBookingsDto,
  CancelInvoiceDto,
  CreateInvoiceDto,
  InvoiceItemDto,
  QueryInvoiceDto,
  UpdateInvoiceDto,
  UpdateInvoiceItemDto,
} from './dto/invoice.dto.js';

@Controller('invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  // ---------------- Invoices ----------------

  @Post()
  create(@Req() req: any, @Body() dto: CreateInvoiceDto) {
    const { companyId, userId } = getContext(req);
    return this.service.create(companyId, userId, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: QueryInvoiceDto) {
    const { companyId } = getContext(req);
    return this.service.findAll(companyId, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    const { companyId } = getContext(req);
    return this.service.update(companyId, id, dto);
  }

  @Patch(':id/issue')
  issue(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.issue(companyId, id);
  }

  @Patch(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  cancel(@Req() req: any, @Param('id') id: string, @Body() dto: CancelInvoiceDto) {
    const { companyId } = getContext(req);
    return this.service.cancel(companyId, id, dto.reason);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.remove(companyId, id);
  }

  // ---------------- Invoice items (draft invoices) ----------------

  @Post(':id/items')
  addItem(@Req() req: any, @Param('id') id: string, @Body() dto: InvoiceItemDto) {
    const { companyId } = getContext(req);
    return this.service.addItem(companyId, id, dto);
  }

  @Post(':id/bookings')
  addBookings(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddInvoiceBookingsDto,
  ) {
    const { companyId } = getContext(req);
    return this.service.addBookings(companyId, id, dto.bookingIds);
  }

  @Patch(':id/items/:itemId')
  updateItem(
    @Req() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInvoiceItemDto,
  ) {
    const { companyId } = getContext(req);
    return this.service.updateItem(companyId, id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  removeItem(
    @Req() req: any,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
  ) {
    const { companyId } = getContext(req);
    return this.service.removeItem(companyId, id, itemId);
  }
}
