import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import { dateRange, num, pageParams, round2 } from './finance.utils.js';

@Injectable()
export class OfficeExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  create(companyId: string, dto: any) {
    return this.prisma.officeExpense.create({
      data: {
        companyId,
        category: dto.category,
        amount: round2(dto.amount),
        mode: dto.mode,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        description: dto.description,
        receiptUrl: dto.receiptUrl,
      },
    });
  }

  async findAll(companyId: string, query: any = {}) {
    const { page, limit, skip } = pageParams(query);

    const where: Prisma.OfficeExpenseWhereInput = { companyId };
    if (query.category) where.category = query.category;
    if (query.mode) where.mode = query.mode;
    if (query.search) {
      where.description = { contains: query.search, mode: 'insensitive' };
    }

    const range = dateRange(query.from, query.to);
    if (range) where.expenseDate = range;

    const [data, total, sum] = await Promise.all([
      this.prisma.officeExpense.findMany({
        where,
        orderBy: { expenseDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.officeExpense.count({ where }),
      this.prisma.officeExpense.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      data,
      pagination: { page, limit, total },
      totalAmount: round2(num(sum._sum.amount)),
    };
  }

  async findOne(companyId: string, id: string) {
    const expense = await this.prisma.officeExpense.findFirst({
      where: { id, companyId },
    });
    if (!expense) throw new NotFoundException('Office expense not found');
    return expense;
  }

  async update(companyId: string, id: string, dto: any) {
    await this.findOne(companyId, id);

    return this.prisma.officeExpense.update({
      where: { id },
      data: {
        category: dto.category,
        amount: dto.amount !== undefined ? round2(dto.amount) : undefined,
        mode: dto.mode,
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : undefined,
        description: dto.description,
        receiptUrl: dto.receiptUrl,
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);
    await this.prisma.officeExpense.delete({ where: { id } });
    return { message: 'Office expense deleted' };
  }

  /** Totals by category for a period. */
  async summary(companyId: string, query: { from?: string; to?: string } = {}) {
    const where: Prisma.OfficeExpenseWhereInput = { companyId };
    const range = dateRange(query.from, query.to);
    if (range) where.expenseDate = range;

    const grouped = await this.prisma.officeExpense.groupBy({
      by: ['category'],
      where,
      _sum: { amount: true },
      _count: { _all: true },
    });

    const byCategory = grouped
      .map((row) => ({
        category: row.category,
        count: row._count._all,
        total: round2(num(row._sum.amount)),
      }))
      .sort((a, b) => b.total - a.total);

    return {
      period: { from: query.from ?? null, to: query.to ?? null },
      grandTotal: round2(byCategory.reduce((sum, row) => sum + row.total, 0)),
      byCategory,
    };
  }
}
