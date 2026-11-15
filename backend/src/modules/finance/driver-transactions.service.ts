import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  DriverTransactionType,
  LedgerEntryType,
  LedgerPartyType,
} from '../../generated/prisma/enums.js';
import { LedgerService } from './ledger.service.js';
import { dateRange, num, pageParams, round2 } from './finance.utils.js';

/** Types that are earned by the driver and paid out in the same step. */
const EARNING_TYPES: DriverTransactionType[] = [
  DriverTransactionType.SALARY,
  DriverTransactionType.TRIP_ALLOWANCE,
  DriverTransactionType.BONUS,
];

@Injectable()
export class DriverTransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  /**
   * Driver ledger posting rules (balance > 0 means the company owes the driver):
   *
   *  SALARY / TRIP_ALLOWANCE / BONUS  CREDIT (earned) + DEBIT (paid)  => net 0
   *  ADVANCE                          DEBIT   (driver now owes the company)
   *  DEDUCTION                        CREDIT  (recovers advances / penalties)
   *  SETTLEMENT                       clears the outstanding balance in whichever
   *                                   direction it currently stands
   */
  async create(companyId: string, dto: any) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: dto.driverId, companyId },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    if (dto.tripId) {
      const trip = await this.prisma.trip.findFirst({
        where: { id: dto.tripId, companyId },
        select: { driverId: true },
      });
      if (!trip) throw new NotFoundException('Trip not found');
      if (trip.driverId !== dto.driverId) {
        throw new BadRequestException('This trip is not assigned to the selected driver');
      }
    }

    const type = dto.type as DriverTransactionType;
    const amount = round2(dto.amount);
    const date = dto.date ? new Date(dto.date) : new Date();

    if (type === DriverTransactionType.SALARY) {
      if (!dto.forMonth) {
        throw new BadRequestException('forMonth (YYYY-MM) is required for salary');
      }

      const existing = await this.prisma.driverTransaction.findFirst({
        where: { driverId: dto.driverId, type, forMonth: dto.forMonth },
      });
      if (existing) {
        throw new ConflictException(`Salary for ${dto.forMonth} is already recorded`);
      }
    }

    let settlementDirection: LedgerEntryType | undefined;
    if (type === DriverTransactionType.SETTLEMENT) {
      const balance = await this.ledger.getBalance(
        companyId,
        LedgerPartyType.DRIVER,
        dto.driverId,
      );

      if (balance === 0) {
        throw new BadRequestException('There is no outstanding balance to settle');
      }
      if (amount > Math.abs(balance)) {
        throw new BadRequestException(
          `Amount exceeds the outstanding balance of ${Math.abs(balance).toFixed(2)}`,
        );
      }

      // balance < 0: driver owes us, settlement is money coming in (CREDIT)
      settlementDirection =
        balance < 0 ? LedgerEntryType.CREDIT : LedgerEntryType.DEBIT;
    }

    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.driverTransaction.create({
        data: {
          driverId: dto.driverId,
          tripId: dto.tripId,
          type,
          amount,
          paymentMode: dto.paymentMode,
          date,
          forMonth: dto.forMonth,
          remarks: dto.remarks,
        },
        include: {
          driver: { select: { id: true, name: true } },
          trip: { select: { id: true, tripNo: true } },
        },
      });

      const base = {
        partyType: LedgerPartyType.DRIVER,
        partyId: dto.driverId,
        amount,
        entryDate: date,
        refType: 'DRIVER_TXN',
        refId: transaction.id,
      };
      const label = type.replace(/_/g, ' ').toLowerCase();
      const note = dto.forMonth ? ` (${dto.forMonth})` : '';

      if (EARNING_TYPES.includes(type)) {
        await this.ledger.post(tx, {
          ...base,
          entryType: LedgerEntryType.CREDIT,
          description: `${label} earned${note}`,
        });
        await this.ledger.post(tx, {
          ...base,
          entryType: LedgerEntryType.DEBIT,
          description: `${label} paid${note}`,
        });
      } else if (type === DriverTransactionType.ADVANCE) {
        await this.ledger.post(tx, {
          ...base,
          entryType: LedgerEntryType.DEBIT,
          description: `Advance paid${dto.remarks ? ` - ${dto.remarks}` : ''}`,
        });
      } else if (type === DriverTransactionType.DEDUCTION) {
        await this.ledger.post(tx, {
          ...base,
          entryType: LedgerEntryType.CREDIT,
          description: `Deduction${dto.remarks ? ` - ${dto.remarks}` : ''}`,
        });
      } else {
        await this.ledger.post(tx, {
          ...base,
          entryType: settlementDirection!,
          description: 'Settlement',
        });
      }

      return transaction;
    });
  }

  async findAll(companyId: string, query: any = {}) {
    const { page, limit, skip } = pageParams(query);

    const where: Prisma.DriverTransactionWhereInput = { driver: { companyId } };
    if (query.driverId) where.driverId = query.driverId;
    if (query.tripId) where.tripId = query.tripId;
    if (query.type) where.type = query.type;
    if (query.forMonth) where.forMonth = query.forMonth;

    const range = dateRange(query.from, query.to);
    if (range) where.date = range;

    const [data, total, grouped] = await Promise.all([
      this.prisma.driverTransaction.findMany({
        where,
        include: {
          driver: { select: { id: true, name: true } },
          trip: { select: { id: true, tripNo: true } },
        },
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.driverTransaction.count({ where }),
      this.prisma.driverTransaction.groupBy({
        by: ['type'],
        where,
        _sum: { amount: true },
      }),
    ]);

    const totalsByType: Record<string, number> = {};
    for (const row of grouped) totalsByType[row.type] = round2(num(row._sum.amount));

    return { data, pagination: { page, limit, total }, totalsByType };
  }

  async findOne(companyId: string, id: string) {
    const transaction = await this.prisma.driverTransaction.findFirst({
      where: { id, driver: { companyId } },
      include: {
        driver: { select: { id: true, name: true } },
        trip: { select: { id: true, tripNo: true } },
      },
    });
    if (!transaction) throw new NotFoundException('Driver transaction not found');
    return transaction;
  }

  async remove(companyId: string, id: string) {
    await this.findOne(companyId, id);

    await this.prisma.$transaction(async (tx) => {
      await this.ledger.removeByRef(tx, ['DRIVER_TXN'], id);
      await tx.driverTransaction.delete({ where: { id } });
    });

    return { message: 'Driver transaction reversed' };
  }

  /** Month view for payroll: what was paid, advanced and deducted. */
  async getSalarySummary(companyId: string, driverId: string, month: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
      select: { id: true, name: true, monthlySalary: true },
    });
    if (!driver) throw new NotFoundException('Driver not found');

    const [year, mon] = month.split('-').map(Number);
    const start = new Date(Date.UTC(year, mon - 1, 1));
    const end = new Date(Date.UTC(year, mon, 1));

    const transactions = await this.prisma.driverTransaction.findMany({
      where: {
        driverId,
        OR: [
          { forMonth: month },
          { forMonth: null, date: { gte: start, lt: end } },
        ],
      },
      orderBy: { date: 'asc' },
    });

    const totals: Record<string, number> = {};
    for (const t of transactions) {
      totals[t.type] = round2((totals[t.type] ?? 0) + num(t.amount));
    }

    const monthlySalary = num(driver.monthlySalary);
    const salaryPaid = totals[DriverTransactionType.SALARY] ?? 0;
    const ledgerBalance = await this.ledger.getBalance(
      companyId,
      LedgerPartyType.DRIVER,
      driverId,
    );

    return {
      driver: { id: driver.id, name: driver.name },
      month,
      monthlySalary,
      salaryPaid,
      salaryDue: round2(monthlySalary - salaryPaid),
      tripAllowance: totals[DriverTransactionType.TRIP_ALLOWANCE] ?? 0,
      bonus: totals[DriverTransactionType.BONUS] ?? 0,
      advances: totals[DriverTransactionType.ADVANCE] ?? 0,
      deductions: totals[DriverTransactionType.DEDUCTION] ?? 0,
      settlements: totals[DriverTransactionType.SETTLEMENT] ?? 0,
      // negative ledger balance => driver owes the company (unrecovered advances)
      outstandingAdvance: ledgerBalance < 0 ? Math.abs(ledgerBalance) : 0,
      ledgerBalance,
      transactions,
    };
  }
}
