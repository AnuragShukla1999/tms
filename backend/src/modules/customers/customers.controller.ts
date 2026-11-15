import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { UserRole } from '../../generated/prisma/enums.js';

import { CustomersService } from './customers.service.js';
import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { QueryCustomerDto } from './dto/query-customer.dto.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string | null;
    branchId?: string;
    role: UserRole;
  };
}

@Controller('customers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  private getCompanyId(req: AuthenticatedRequest): string {
    if (!req.user.companyId) {
      throw new BadRequestException(
        'Your account is not associated with a company',
      );
    }

    return req.user.companyId;
  }

  // CREATE CUSTOMER
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateCustomerDto,
  ) {
    return this.customersService.create(
      this.getCompanyId(req),
      dto,
    );
  }

  // GET ALL CUSTOMERS
  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
  )
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: QueryCustomerDto,
  ) {
    return this.customersService.findAll(
      this.getCompanyId(req),
      query,
    );
  }

  // GET SINGLE CUSTOMER
  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
  )
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.customersService.findOne(
      this.getCompanyId(req),
      id,
    );
  }

  // UPDATE CUSTOMER
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateCustomerDto,
  ) {
    return this.customersService.update(
      this.getCompanyId(req),
      id,
      dto,
    );
  }

  // DEACTIVATE CUSTOMER
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.customersService.remove(
      this.getCompanyId(req),
      id,
    );
  }

  // ACTIVATE CUSTOMER
  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.MANAGER)
  activate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.customersService.activate(
      this.getCompanyId(req),
      id,
    );
  }
}