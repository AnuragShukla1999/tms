import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { QueryUserDto } from './dto/query-user.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { PrismaService } from '../../database/prisma.service.js';


const employeeRoles: UserRole[] = [
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.DISPATCHER,
  UserRole.ACCOUNTANT,
];

function isUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE EMPLOYEE
  async create(
    companyId: string,
    actorRole: UserRole,
    dto: CreateUserDto,
  ) {
    if (!employeeRoles.includes(dto.role)) {
      throw new BadRequestException('Invalid employee role');
    }

    if (actorRole === UserRole.ADMIN && dto.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can create another ADMIN',
      );
    }

    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        isActive: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Active company not found');
    }

    // Validate branch belongs to this company.
    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          companyId,
          isActive: true,
        },
      });

      if (!branch) {
        throw new BadRequestException(
          'Invalid or inactive branch for this company',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email: dto.email?.trim().toLowerCase(),
          phone: dto.phone.trim(),
          passwordHash,
          role: dto.role,
          companyId,
          branchId: dto.branchId,
        },
        select: {
          id: true,
          companyId: true,
          branchId: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          isActive: true,
          createdAt: true,
        },
      });

      return {
        message: 'Employee created successfully',
        data: user,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Email or phone number already exists',
        );
      }

      throw error;
    }
  }

  // GET ALL EMPLOYEES
  async findAll(companyId: string, query: QueryUserDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      role: {
        in: employeeRoles,
      },
    };

    if (query.search) {
      where.OR = [
        {
          name: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          email: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          phone: {
            contains: query.search,
          },
        },
      ];
    }

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          branchId: true,
          isActive: true,
          createdAt: true,
          branch: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
        },
      }),

      this.prisma.user.count({ where }),
    ]);

    return {
      message: 'Employees fetched successfully',
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET SINGLE EMPLOYEE
  async findOne(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        role: {
          in: employeeRoles,
        },
      },
      select: {
        id: true,
        companyId: true,
        branchId: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Employee not found');
    }

    return {
      message: 'Employee fetched successfully',
      data: user,
    };
  }

  // UPDATE EMPLOYEE
  async update(
    companyId: string,
    userId: string,
    actorRole: UserRole,
    dto: UpdateUserDto,
  ) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        role: {
          in: employeeRoles,
        },
      },
    });

    if (!existingUser) {
      throw new NotFoundException('Employee not found');
    }

    if (dto.role && !employeeRoles.includes(dto.role)) {
      throw new BadRequestException('Invalid employee role');
    }

    if (actorRole === UserRole.ADMIN && dto.role === UserRole.ADMIN) {
      throw new ForbiddenException(
        'Only SUPER_ADMIN can assign ADMIN role',
      );
    }

    if (dto.branchId) {
      const branch = await this.prisma.branch.findFirst({
        where: {
          id: dto.branchId,
          companyId,
          isActive: true,
        },
      });

      if (!branch) {
        throw new BadRequestException(
          'Invalid or inactive branch for this company',
        );
      }
    }

    const data: any = {
      name: dto.name?.trim(),
      email: dto.email?.trim().toLowerCase(),
      phone: dto.phone?.trim(),
      role: dto.role,
      branchId: dto.branchId,
    };

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 12);
    }

    try {
      const updatedUser = await this.prisma.user.update({
        where: {
          id: userId,
        },
        data,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          branchId: true,
          isActive: true,
          updatedAt: true,
        },
      });

      return {
        message: 'Employee updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Email or phone number already exists',
        );
      }

      throw error;
    }
  }

  // SOFT DELETE / DEACTIVATE
  async remove(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        role: {
          in: employeeRoles,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Employee not found');
    }

    if (!user.isActive) {
      throw new BadRequestException('Employee is already inactive');
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isActive: false,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    return {
      message: 'Employee deactivated successfully',
      data: updatedUser,
    };
  }

  // ACTIVATE EMPLOYEE
  async activate(companyId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        companyId,
        role: {
          in: employeeRoles,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Employee not found');
    }

    const updatedUser = await this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        isActive: true,
      },
    });

    return {
      message: 'Employee activated successfully',
      data: updatedUser,
    };
  }
}