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
} from '@nestjs/common';

import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { BranchService } from './branch.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { QueryBranchDto } from './dto/query-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string;
    branchId?: string;
    role: string;
  };
}

@Controller('branches')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BranchController {
  constructor(private readonly branchService: BranchService) {}

  // CREATE
  @Post()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateBranchDto) {
    return this.branchService.create(req.user.companyId, dto);
  }

  // GET ALL
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findAll(@Req() req: AuthenticatedRequest, @Query() query: QueryBranchDto) {
    return this.branchService.findAll(req.user.companyId, query);
  }

  // GET SINGLE
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  findOne(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.branchService.findOne(req.user.companyId, id);
  }

  // UPDATE
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateBranchDto,
  ) {
    return this.branchService.update(req.user.companyId, id, dto);
  }

  // SOFT DELETE
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  remove(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.branchService.remove(req.user.companyId, id);
  }

  // ACTIVATE
  @Patch(':id/activate')
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  activate(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.branchService.activate(req.user.companyId, id);
  }
}
