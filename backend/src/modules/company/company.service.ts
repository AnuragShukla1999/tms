import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

// import { PrismaService } from '../../database/prisma.service';

// import { CreateCompanyDto } from './dto/create-company.dto';

import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateCompanyDto } from './dto/create-company.dto.js';
import { UserRole } from '../../generated/prisma/enums.js';
import { UpdateCompanyDto } from './dto/update-company.dto.js';

// import { UserRole } from '../../generated/prisma/client';

@Injectable()
export class CompanyService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(dto: CreateCompanyDto) {
    const adminEmail = dto.adminEmail.toLowerCase();

    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email: adminEmail },
          { phone: dto.adminPhone },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'Admin email or phone number already exists',
      );
    }

    const passwordHash = await bcrypt.hash(
      dto.adminPassword,
      12,
    );

    try {
      const company = await this.prisma.company.create({
        data: {
          name: dto.name,
          legalName: dto.legalName,
          gstin: dto.gstin,
          phone: dto.phone,
          email: dto.email?.toLowerCase(),
          address: dto.address,
          city: dto.city,
          state: dto.state,
          pincode: dto.pincode,

          // Optional logo
        logoUrl: dto.logoUrl,

          users: {
            create: {
              name: dto.adminName,
              email: adminEmail,
              phone: dto.adminPhone,
              passwordHash,
              role: UserRole.ADMIN,
              isActive: true,
            },
          },
        },

        include: {
          users: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              companyId: true,
            },
          },
        },
      });

      return {
        message: 'Company created successfully',
        data: company,
      };
    } catch (error:any) {
      if (
        error?.code === 'P2002'
      ) {
        throw new ConflictException(
          'Company GSTIN or Admin details already exist',
        );
      }

      throw error;
    }
  }


  async update(id: string, dto: UpdateCompanyDto) {
  const existingCompany = await this.prisma.company.findUnique({
    where: { id },
  });

  if (!existingCompany) {
    throw new NotFoundException('Company not found');
  }

  try {
    const company = await this.prisma.company.update({
      where: { id },
      data: {
        name: dto.name,
        legalName: dto.legalName,
        gstin: dto.gstin,
        phone: dto.phone,
        email:
          dto.email === undefined
            ? undefined
            : dto.email?.toLowerCase() ?? null,
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        logoUrl: dto.logoUrl,
        isActive: dto.isActive,
      },
    });

    return {
      message: 'Company updated successfully',
      data: company,
    };
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new ConflictException(
        'Company GSTIN or another unique field already exists',
      );
    }

    throw error;
  }
}

async remove(id: string) {
  const existingCompany = await this.prisma.company.findUnique({
    where: { id },
  });

  if (!existingCompany) {
    throw new NotFoundException('Company not found');
  }

  if (!existingCompany.isActive) {
    throw new ConflictException(
      'Company is already deactivated',
    );
  }

  const company = await this.prisma.company.update({
    where: { id },
    data: {
      isActive: false,
    },
  });

  return {
    message: 'Company deactivated successfully',
    data: {
      id: company.id,
      name: company.name,
      isActive: company.isActive,
    },
  };
}

  async findAll() {
    return this.prisma.company.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        _count: {
          select: {
            users: true,
            customers: true,
            vehicles: true,
            drivers: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.company.findUnique({
      where: { id },
      include: {
        branches: true,
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
    });
  }
}