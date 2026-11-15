
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateBranchDto } from './dto/create-branch.dto.js';
import { QueryBranchDto } from './dto/query-branch.dto.js';
import { UpdateBranchDto } from './dto/update-branch.dto.js';



@Injectable()
export class BranchService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE BRANCH
  async create(companyId: string, dto: CreateBranchDto) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company || !company.isActive) {
      throw new NotFoundException('Active company not found');
    }

    const code = dto.code.trim().toUpperCase();

    const existingBranch = await this.prisma.branch.findUnique({
      where: {
        companyId_code: {
          companyId,
          code,
        },
      },
    });

    if (existingBranch) {
      throw new ConflictException(
        'Branch code already exists in this company',
      );
    }

    const branch = await this.prisma.branch.create({
      data: {
        ...dto,
        code,
        companyId,
      },
    });

    return {
      message: 'Branch created successfully',
      data: branch,
    };
  }

  // GET ALL BRANCHES
  async findAll(companyId: string, query: QueryBranchDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;

    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
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
          code: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          city: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [branches, total] = await this.prisma.$transaction([
      this.prisma.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.branch.count({ where }),
    ]);

    return {
      message: 'Branches fetched successfully',
      data: branches,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET SINGLE BRANCH
  async findOne(companyId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return {
      message: 'Branch fetched successfully',
      data: branch,
    };
  }

  // UPDATE BRANCH
  async update(
    companyId: string,
    branchId: string,
    dto: UpdateBranchDto,
  ) {
    const existingBranch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId,
      },
    });

    if (!existingBranch) {
      throw new NotFoundException('Branch not found');
    }

    if (dto.code) {
      dto.code = dto.code.trim().toUpperCase();

      const duplicate = await this.prisma.branch.findFirst({
        where: {
          companyId,
          code: dto.code,
          NOT: {
            id: branchId,
          },
        },
      });

      if (duplicate) {
        throw new ConflictException(
          'Branch code already exists in this company',
        );
      }
    }

    const updatedBranch = await this.prisma.branch.update({
      where: {
        id: branchId,
      },
      data: dto,
    });

    return {
      message: 'Branch updated successfully',
      data: updatedBranch,
    };
  }

  // SOFT DELETE BRANCH
  async remove(companyId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    if (!branch.isActive) {
      throw new BadRequestException('Branch is already inactive');
    }

    const deletedBranch = await this.prisma.branch.update({
      where: {
        id: branchId,
      },
      data: {
        isActive: false,
      },
    });

    return {
      message: 'Branch deactivated successfully',
      data: deletedBranch,
    };
  }

  // ACTIVATE BRANCH
  async activate(companyId: string, branchId: string) {
    const branch = await this.prisma.branch.findFirst({
      where: {
        id: branchId,
        companyId,
      },
    });

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    const updatedBranch = await this.prisma.branch.update({
      where: {
        id: branchId,
      },
      data: {
        isActive: true,
      },
    });

    return {
      message: 'Branch activated successfully',
      data: updatedBranch,
    };
  }
}
