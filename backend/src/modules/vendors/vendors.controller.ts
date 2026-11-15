
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';

import { VendorsService } from './vendors.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { QueryVendorDto } from './dto/query-vendor.dto.js';

import { UserRole } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('vendors')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  private getCompanyId(req: any): string {
    const companyId = req.user?.companyId;

    if (!companyId) {
      throw new BadRequestException('Company ID not found in login token');
    }

    return companyId;
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  create(@Req() req: any, @Body() dto: CreateVendorDto) {
    return this.vendorsService.create(this.getCompanyId(req), dto);
  }

  @Get()
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
  )
  findAll(@Req() req: any, @Query() query: QueryVendorDto) {
    return this.vendorsService.findAll(this.getCompanyId(req), query);
  }

  @Get(':id')
  @Roles(
    UserRole.ADMIN,
    UserRole.MANAGER,
    UserRole.DISPATCHER,
    UserRole.ACCOUNTANT,
  )
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.vendorsService.findOne(this.getCompanyId(req), id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorsService.update(this.getCompanyId(req), id, dto);
  }

  @Patch(':id/deactivate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deactivate(@Req() req: any, @Param('id') id: string) {
    return this.vendorsService.deactivate(this.getCompanyId(req), id);
  }

  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  activate(@Req() req: any, @Param('id') id: string) {
    return this.vendorsService.activate(this.getCompanyId(req), id);
  }
}
