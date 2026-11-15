
import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { CreateVendorDto } from './dto/create-vendor.dto.js';
import { UpdateVendorDto } from './dto/update-vendor.dto.js';
import { QueryVendorDto } from './dto/query-vendor.dto.js';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(companyId: string, dto: CreateVendorDto) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException('Company not found or inactive');
    }

    try {
      return await this.prisma.vendor.create({
        data: {
          companyId,
          name: dto.name,
          contactPerson: dto.contactPerson,
          phone: dto.phone,
          email: dto.email,
          gstin: dto.gstin,
          pan: dto.pan,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          bankName: dto.bankName,
          bankAccountNo: dto.bankAccountNo,
          ifscCode: dto.ifscCode,
          upiId: dto.upiId,
          openingBalance: dto.openingBalance ?? 0,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async findAll(companyId: string, query: QueryVendorDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
    };

    if (query.search?.trim()) {
      const search = query.search.trim();

      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
        { email: { contains: search, mode: 'insensitive' } },
        { gstin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [vendors, total] = await this.prisma.$transaction([
      this.prisma.vendor.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: { vehicles: true },
          },
        },
      }),
      this.prisma.vendor.count({ where }),
    ]);

    return {
      data: vendors,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(companyId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId,
      },
      include: {
        vehicles: {
          select: {
            id: true,
            registrationNo: true,
            type: true,
            ownership: true,
            status: true,
            isActive: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return vendor;
  }

  async update(
    companyId: string,
    vendorId: string,
    dto: UpdateVendorDto,
  ) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, companyId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    try {
      return await this.prisma.vendor.update({
        where: { id: vendorId },
        data: {
          ...dto,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async deactivate(companyId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, companyId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { isActive: false },
    });
  }

  async activate(companyId: string, vendorId: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: vendorId, companyId },
      select: { id: true },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    return this.prisma.vendor.update({
      where: { id: vendorId },
      data: { isActive: true },
    });
  }

  private handlePrismaError(error: any): never {
    if (error?.code === 'P2002') {
      throw new ConflictException('A vendor with this unique value already exists');
    }

    if (error?.code === 'P2003') {
      throw new BadRequestException('Invalid related record');
    }

    throw error;
  }
}
