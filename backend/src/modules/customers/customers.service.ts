import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

// import { PrismaService } from '../database/prisma.service.js';

import { CreateCustomerDto } from './dto/create-customer.dto.js';
import { UpdateCustomerDto } from './dto/update-customer.dto.js';
import { QueryCustomerDto } from './dto/query-customer.dto.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  // CREATE CUSTOMER
  async create(companyId: string, dto: CreateCustomerDto) {
    const company = await this.prisma.company.findFirst({
      where: {
        id: companyId,
        isActive: true,
      },
    });

    if (!company) {
      throw new NotFoundException('Active company not found');
    }

    const customer = await this.prisma.customer.create({
      data: {
        companyId,
        name: dto.name.trim(),
        contactPerson: dto.contactPerson,
        phone: dto.phone.trim(),
        alternatePhone: dto.alternatePhone,
        email: dto.email?.trim().toLowerCase(),
        gstin: dto.gstin?.trim().toUpperCase(),
        pan: dto.pan?.trim().toUpperCase(),
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        creditLimit: dto.creditLimit ?? 0,
        creditDays: dto.creditDays ?? 0,
        openingBalance: dto.openingBalance ?? 0,
        notes: dto.notes,
      },
    });

    return {
      message: 'Customer created successfully',
      data: customer,
    };
  }

  // GET ALL CUSTOMERS
  async findAll(companyId: string, query: QueryCustomerDto) {
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
          phone: {
            contains: query.search,
          },
        },
        {
          email: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
        {
          gstin: {
            contains: query.search,
            mode: 'insensitive',
          },
        },
      ];
    }

    const [customers, total] = await this.prisma.$transaction([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),

      this.prisma.customer.count({ where }),
    ]);

    return {
      message: 'Customers fetched successfully',
      data: customers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET SINGLE CUSTOMER
  async findOne(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
      include: {
        addresses: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return {
      message: 'Customer fetched successfully',
      data: customer,
    };
  }

  // UPDATE CUSTOMER
  async update(
    companyId: string,
    customerId: string,
    dto: UpdateCustomerDto,
  ) {
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
    });

    if (!existingCustomer) {
      throw new NotFoundException('Customer not found');
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: {
        id: customerId,
      },
      data: {
        name: dto.name?.trim(),
        contactPerson: dto.contactPerson,
        phone: dto.phone?.trim(),
        alternatePhone: dto.alternatePhone,
        email: dto.email?.trim().toLowerCase(),
        gstin: dto.gstin?.trim().toUpperCase(),
        pan: dto.pan?.trim().toUpperCase(),
        address: dto.address,
        city: dto.city,
        state: dto.state,
        pincode: dto.pincode,
        creditLimit: dto.creditLimit,
        creditDays: dto.creditDays,
        openingBalance: dto.openingBalance,
        notes: dto.notes,
      },
    });

    return {
      message: 'Customer updated successfully',
      data: updatedCustomer,
    };
  }

  // SOFT DELETE / DEACTIVATE CUSTOMER
  async remove(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    if (!customer.isActive) {
      throw new BadRequestException('Customer is already inactive');
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: {
        id: customerId,
      },
      data: {
        isActive: false,
      },
    });

    return {
      message: 'Customer deactivated successfully',
      data: updatedCustomer,
    };
  }

  // ACTIVATE CUSTOMER
  async activate(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    const updatedCustomer = await this.prisma.customer.update({
      where: {
        id: customerId,
      },
      data: {
        isActive: true,
      },
    });

    return {
      message: 'Customer activated successfully',
      data: updatedCustomer,
    };
  }
}