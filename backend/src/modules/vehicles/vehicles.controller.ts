import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  Req,
  UseGuards,
} from '@nestjs/common';

import { VehiclesService } from './vehicles.service.js';

import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { UserRole } from '../../generated/prisma/enums.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    companyId: string;
    branchId?: string;
    role: UserRole;
  };
}

@Controller('vehicles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER)
export class VehiclesController {
  constructor(
    private readonly vehiclesService: VehiclesService,
  ) {}

  // CREATE
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateVehicleDto,
  ) {
    return this.vehiclesService.create(
      req.user.companyId,
      dto,
    );
  }

  // GET ALL
  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.vehiclesService.findAll(
      req.user.companyId,
    );
  }

  // GET BY ID
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.findOne(
      req.user.companyId,
      id,
    );
  }

  // UPDATE
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(
      req.user.companyId,
      id,
      dto,
    );
  }

  // DELETE
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.vehiclesService.remove(
      req.user.companyId,
      id,
    );
  }
}