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

import { OfficeExpensesService } from './office-expenses.service.js';
import { getContext } from './finance.utils.js';
import {
  CreateOfficeExpenseDto,
  OfficeExpenseSummaryQueryDto,
  QueryOfficeExpenseDto,
  UpdateOfficeExpenseDto,
} from './dto/office-expense.dto.js';

@Controller('office-expenses')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class OfficeExpensesController {
  constructor(private readonly service: OfficeExpensesService) {}

  @Post()
  create(@Req() req: any, @Body() dto: CreateOfficeExpenseDto) {
    const { companyId } = getContext(req);
    return this.service.create(companyId, dto);
  }

  @Get()
  findAll(@Req() req: any, @Query() query: QueryOfficeExpenseDto) {
    const { companyId } = getContext(req);
    return this.service.findAll(companyId, query);
  }

  @Get('summary')
  summary(@Req() req: any, @Query() query: OfficeExpenseSummaryQueryDto) {
    const { companyId } = getContext(req);
    return this.service.summary(companyId, query);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.findOne(companyId, id);
  }

  @Patch(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateOfficeExpenseDto,
  ) {
    const { companyId } = getContext(req);
    return this.service.update(companyId, id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  remove(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.remove(companyId, id);
  }
}
