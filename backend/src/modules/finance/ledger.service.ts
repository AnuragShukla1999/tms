import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  LedgerEntryType,
  LedgerPartyType,
  TripStatus,
} from '../../generated/prisma/enums.js';
import { dateRange, num, round2 } from './finance.utils.js';

export interface LedgerPostInput {
  partyType: LedgerPartyType;
  partyId: string;
  entryType: LedgerEntryType;
  amount: number;
  entryDate?: Date;
  description?: string;
  refType?: string;
  refId?: string;
}

/**
 * Sign convention
 * ---------------
 * CUSTOMER  balance = opening + DEBIT - CREDIT   (positive = customer owes us)
 * VENDOR    balance = opening + CREDIT - DEBIT   (positive = we owe the vendor)
 * DRIVER    balance = CREDIT - DEBIT             (positive = we owe the driver,
 *                                                 negative = driver owes us)
 */
function signedAmount(
  partyType: LedgerPartyType,
  entryType: LedgerEntryType,
  amount: number,
): number {
  const debitIsPositive = partyType === LedgerPartyType.CUSTOMER;
  const isDebit = entryType === LedgerEntryType.DEBIT;
  return debitIsPositive === isDebit ? amount : -amount;
}

function natureOf(partyType: LedgerPartyType): 'RECEIVABLE' | 'PAYABLE' {
  return partyType === LedgerPartyType.CUSTOMER ? 'RECEIVABLE' : 'PAYABLE';
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------
  // PARTY HELPERS
  // -------------------------------------------------------

  /** Confirms the party belongs to the company and returns its basics. */
  async getParty(
    companyId: string,
    partyType: LedgerPartyType,
    partyId: string,
  ): Promise<{ id: string; name: string; openingBalance: number }> {
    if (partyType === LedgerPartyType.CUSTOMER) {
      const party = await this.prisma.customer.findFirst({
        where: { id: partyId, companyId },
        select: { id: true, name: true, openingBalance: true },
      });
      if (!party) throw new NotFoundException('Customer not found');
      return { ...party, openingBalance: num(party.openingBalance) };
    }

    if (partyType === LedgerPartyType.VENDOR) {
      const party = await this.prisma.vendor.findFirst({
        where: { id: partyId, companyId },
        select: { id: true, name: true, openingBalance: true },
      });
      if (!party) throw new NotFoundException('Vendor not found');
      return { ...party, openingBalance: num(party.openingBalance) };
    }

    const party = await this.prisma.driver.findFirst({
      where: { id: partyId, companyId },
      select: { id: true, name: true },
    });
    if (!party) throw new NotFoundException('Driver not found');
    return { ...party, openingBalance: 0 };
  }

  // -------------------------------------------------------
  // POSTING (used by the other finance services inside a transaction)
  // -------------------------------------------------------

  async post(tx: Prisma.TransactionClient, input: LedgerPostInput) {
    if (!(input.amount > 0)) {
      throw new BadRequestException('Ledger amount must be greater than zero');
    }

    return tx.ledgerEntry.create({
      data: {
        partyType: input.partyType,
        partyId: input.partyId,
        entryType: input.entryType,
        amount: round2(input.amount),
        entryDate: input.entryDate ?? new Date(),
        description: input.description,
        refType: input.refType,
        refId: input.refId,
      },
    });
  }

  /** Removes every ledger row created for a source document. */
  async removeByRef(
    tx: Prisma.TransactionClient,
    refTypes: string[],
    refId: string,
  ) {
    return tx.ledgerEntry.deleteMany({
      where: { refType: { in: refTypes }, refId },
    });
  }

  // -------------------------------------------------------
  // BALANCES
  // -------------------------------------------------------

  private async netMovement(
    partyType: LedgerPartyType,
    partyId: string,
    entryDate?: { lt?: Date; gte?: Date; lte?: Date },
  ): Promise<{ debit: number; credit: number; net: number }> {
    const grouped = await this.prisma.ledgerEntry.groupBy({
      by: ['entryType'],
      where: { partyType, partyId, ...(entryDate ? { entryDate } : {}) },
      _sum: { amount: true },
    });

    let debit = 0;
    let credit = 0;
    for (const row of grouped) {
      if (row.entryType === LedgerEntryType.DEBIT) debit = num(row._sum.amount);
      else credit = num(row._sum.amount);
    }

    const net =
      partyType === LedgerPartyType.CUSTOMER ? debit - credit : credit - debit;

    return { debit: round2(debit), credit: round2(credit), net: round2(net) };
  }

  /** Current balance (opening + all entries) using the sign convention above. */
  async getBalance(
    companyId: string,
    partyType: LedgerPartyType,
    partyId: string,
  ): Promise<number> {
    const party = await this.getParty(companyId, partyType, partyId);
    const movement = await this.netMovement(partyType, partyId);
    return round2(party.openingBalance + movement.net);
  }

  // -------------------------------------------------------
  // STATEMENT  (GET /ledger/:partyType/:partyId)
  // -------------------------------------------------------

  async getStatement(
    companyId: string,
    partyType: LedgerPartyType,
    partyId: string,
    query: { from?: string; to?: string } = {},
  ) {
    const party = await this.getParty(companyId, partyType, partyId);
    const range = dateRange(query.from, query.to);

    // Balance carried into the period = opening balance + everything before `from`.
    let openingBalance = party.openingBalance;
    if (query.from) {
      const before = await this.netMovement(partyType, partyId, {
        lt: new Date(query.from),
      });
      openingBalance += before.net;
    }

    const entries = await this.prisma.ledgerEntry.findMany({
      where: { partyType, partyId, ...(range ? { entryDate: range } : {}) },
      orderBy: [{ entryDate: 'asc' }, { createdAt: 'asc' }],
    });

    let running = openingBalance;
    let totalDebit = 0;
    let totalCredit = 0;

    const rows = entries.map((entry) => {
      const amount = num(entry.amount);
      running = round2(running + signedAmount(partyType, entry.entryType, amount));
      if (entry.entryType === LedgerEntryType.DEBIT) totalDebit += amount;
      else totalCredit += amount;

      return { ...entry, amount, balance: running };
    });

    return {
      party: { id: party.id, name: party.name, type: partyType },
      nature: natureOf(partyType),
      balanceNote:
        partyType === LedgerPartyType.CUSTOMER
          ? 'Positive balance = customer owes you'
          : partyType === LedgerPartyType.VENDOR
            ? 'Positive balance = you owe the vendor'
            : 'Positive balance = you owe the driver; negative = driver owes you (e.g. unrecovered advance)',
      period: { from: query.from ?? null, to: query.to ?? null },
      openingBalance: round2(openingBalance),
      totalDebit: round2(totalDebit),
      totalCredit: round2(totalCredit),
      closingBalance: round2(running),
      entries: rows,
    };
  }

  // -------------------------------------------------------
  // OUTSTANDING SUMMARY  (GET /ledger/summary?partyType=)
  // -------------------------------------------------------

  async getSummary(
    companyId: string,
    partyType: LedgerPartyType,
    onlyOutstanding = false,
  ) {
    let parties: { id: string; name: string; openingBalance: number }[];

    if (partyType === LedgerPartyType.CUSTOMER) {
      const rows = await this.prisma.customer.findMany({
        where: { companyId },
        select: { id: true, name: true, openingBalance: true },
      });
      parties = rows.map((r) => ({ ...r, openingBalance: num(r.openingBalance) }));
    } else if (partyType === LedgerPartyType.VENDOR) {
      const rows = await this.prisma.vendor.findMany({
        where: { companyId },
        select: { id: true, name: true, openingBalance: true },
      });
      parties = rows.map((r) => ({ ...r, openingBalance: num(r.openingBalance) }));
    } else {
      const rows = await this.prisma.driver.findMany({
        where: { companyId },
        select: { id: true, name: true },
      });
      parties = rows.map((r) => ({ ...r, openingBalance: 0 }));
    }

    const grouped = parties.length
      ? await this.prisma.ledgerEntry.groupBy({
          by: ['partyId', 'entryType'],
          where: { partyType, partyId: { in: parties.map((p) => p.id) } },
          _sum: { amount: true },
        })
      : [];

    const movement = new Map<string, { debit: number; credit: number }>();
    for (const row of grouped) {
      const current = movement.get(row.partyId) ?? { debit: 0, credit: 0 };
      if (row.entryType === LedgerEntryType.DEBIT) {
        current.debit = num(row._sum.amount);
      } else {
        current.credit = num(row._sum.amount);
      }
      movement.set(row.partyId, current);
    }

    let list = parties.map((party) => {
      const m = movement.get(party.id) ?? { debit: 0, credit: 0 };
      const net =
        partyType === LedgerPartyType.CUSTOMER
          ? m.debit - m.credit
          : m.credit - m.debit;

      return {
        partyId: party.id,
        name: party.name,
        openingBalance: party.openingBalance,
        totalDebit: round2(m.debit),
        totalCredit: round2(m.credit),
        balance: round2(party.openingBalance + net),
      };
    });

    if (onlyOutstanding) list = list.filter((row) => row.balance !== 0);
    list.sort((a, b) => b.balance - a.balance);

    return {
      partyType,
      nature: natureOf(partyType),
      totalOutstanding: round2(list.reduce((sum, row) => sum + row.balance, 0)),
      parties: list,
    };
  }

  // -------------------------------------------------------
  // MANUAL ADJUSTMENTS
  // -------------------------------------------------------

  async createAdjustment(companyId: string, dto: {
    partyType: LedgerPartyType;
    partyId: string;
    entryType: LedgerEntryType;
    amount: number;
    entryDate?: string;
    description: string;
  }) {
    await this.getParty(companyId, dto.partyType, dto.partyId);

    return this.prisma.ledgerEntry.create({
      data: {
        partyType: dto.partyType,
        partyId: dto.partyId,
        entryType: dto.entryType,
        amount: round2(dto.amount),
        entryDate: dto.entryDate ? new Date(dto.entryDate) : new Date(),
        description: dto.description,
        refType: 'ADJUSTMENT',
      },
    });
  }

  async deleteAdjustment(companyId: string, id: string) {
    const entry = await this.prisma.ledgerEntry.findUnique({ where: { id } });
    if (!entry) throw new NotFoundException('Ledger entry not found');

    // Confirms the party belongs to this company (throws 404 otherwise).
    await this.getParty(companyId, entry.partyType, entry.partyId);

    if (entry.refType !== 'ADJUSTMENT') {
      throw new BadRequestException(
        'Only manual adjustment entries can be deleted. Reverse the source document instead.',
      );
    }

    await this.prisma.ledgerEntry.delete({ where: { id } });
    return { message: 'Ledger adjustment deleted' };
  }

  // -------------------------------------------------------
  // VENDOR HIRE ACCRUAL
  // Posts what we owe the vendor for a completed market-vehicle trip.
  // -------------------------------------------------------

  async postVendorTripHire(companyId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
    });
    if (!trip) throw new NotFoundException('Trip not found');

    if (!trip.vendorId) {
      throw new BadRequestException('This trip has no vendor attached');
    }
    if (trip.status !== TripStatus.COMPLETED) {
      throw new BadRequestException('Hire charges can be posted only for completed trips');
    }
    if (num(trip.hireCharges) <= 0) {
      throw new BadRequestException('This trip has no hire charges');
    }

    const existing = await this.prisma.ledgerEntry.findFirst({
      where: { refType: 'TRIP_HIRE', refId: tripId },
    });
    if (existing) {
      throw new ConflictException('Hire charges for this trip are already posted');
    }

    return this.prisma.$transaction((tx) =>
      this.post(tx, {
        partyType: LedgerPartyType.VENDOR,
        partyId: trip.vendorId!,
        entryType: LedgerEntryType.CREDIT,
        amount: num(trip.hireCharges),
        entryDate: trip.actualEnd ?? new Date(),
        description: `Hire charges for trip ${trip.tripNo}`,
        refType: 'TRIP_HIRE',
        refId: tripId,
      }),
    );
  }
}
