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



import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    companyId: string | null;
    branchId?: string;
    role: UserRole;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  private getCompanyId(req: AuthenticatedRequest): string {
    if (!req.user.companyId) {
      throw new BadRequestException(
        'Your account is not associated with a company',
      );
    }

    return req.user.companyId;
  }

  // CREATE EMPLOYEE
  @Post()
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateUserDto,
  ) {
    return this.usersService.create(
      this.getCompanyId(req),
      req.user.role,
      dto,
    );
  }

  // GET ALL EMPLOYEES
  @Get()
  findAll(
    @Req() req: AuthenticatedRequest,
    @Query() query: QueryUserDto,
  ) {
    return this.usersService.findAll(
      this.getCompanyId(req),
      query,
    );
  }

  // GET SINGLE EMPLOYEE
  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.usersService.findOne(
      this.getCompanyId(req),
      id,
    );
  }

  // UPDATE EMPLOYEE
  @Patch(':id')
  update(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(
      this.getCompanyId(req),
      id,
      req.user.role,
      dto,
    );
  }

  // DEACTIVATE EMPLOYEE
  @Delete(':id')
  remove(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.usersService.remove(
      this.getCompanyId(req),
      id,
    );
  }

  // ACTIVATE EMPLOYEE
  @Patch(':id/activate')
  activate(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return this.usersService.activate(
      this.getCompanyId(req),
      id,
    );
  }
}