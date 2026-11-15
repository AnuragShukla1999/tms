import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  BookingStatus,
  InvoiceStatus,
  LedgerEntryType,
  LedgerPartyType,
} from '../../generated/prisma/enums.js';
import { LedgerService } from './ledger.service.js';
import { addDays, dateRange, num, pageParams, round2 } from './finance.utils.js';

interface LineInput {
  bookingId?: string | null;
  description: string;
  sacCode?: string | null;
  quantity: number;
  rate: number;
  gstPercent: number;
}

const normalize = (value?: string | null) =>
  (value ?? '').trim().toLowerCase();

@Injectable()
export class InvoicesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  // =======================================================
  // CALCULATION
  // =======================================================

  /**
   * GST rule: intra-state supply => CGST + SGST (half each);
   * inter-state => IGST. If either state is unknown we assume intra-state.
   */
  private isIntraState(companyState?: string | null, supplyState?: string | null) {
    const a = normalize(companyState);
    const b = normalize(supplyState);
    if (!a || !b) return true;
    return a === b;
  }

  /**
   * Pure calculation. The discount is spread proportionally over the lines
   * so GST is charged on the discounted (taxable) value.
   */
  private compute(
    lines: { amount: number; gstPercent: number }[],
    discountInput: number,
    intraState: boolean,
  ) {
    const subtotal = round2(lines.reduce((sum, l) => sum + l.amount, 0));
    const discount = round2(discountInput);

    if (discount > subtotal) {
      throw new BadRequestException('Discount cannot exceed the invoice subtotal');
    }

    const ratio = subtotal > 0 ? (subtotal - discount) / subtotal : 0;
    const lineGst = lines.map((l) => round2((l.amount * ratio * l.gstPercent) / 100));
    const totalGst = round2(lineGst.reduce((sum, g) => sum + g, 0));

    const cgst = intraState ? round2(totalGst / 2) : 0;
    const sgst = intraState ? round2(totalGst - cgst) : 0;
    const igst = intraState ? 0 : totalGst;

    const gross = round2(subtotal - discount + totalGst);
    const totalAmount = Math.round(gross);
    const roundOff = round2(totalAmount - gross);

    return { subtotal, discount, lineGst, cgst, sgst, igst, roundOff, totalAmount };
  }

  /** Re-reads the items and refreshes every total on the invoice. */
  private async recalculate(tx: Prisma.TransactionClient, invoiceId: string) {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: {
        items: { orderBy: { id: 'asc' } },
        company: { select: { state: true } },
        customer: { select: { state: true } },
      },
    });

    const intra = this.isIntraState(
      invoice.company.state,
      invoice.placeOfSupply ?? invoice.customer.state,
    );

    const result = this.compute(
      invoice.items.map((item) => ({
        amount: num(item.amount),
        gstPercent: num(item.gstPercent),
      })),
      num(invoice.discount),
      intra,
    );

    for (let i = 0; i < invoice.items.length; i++) {
      if (num(invoice.items[i].gstAmount) !== result.lineGst[i]) {
        await tx.invoiceItem.update({
          where: { id: invoice.items[i].id },
          data: { gstAmount: result.lineGst[i] },
        });
      }
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: {
        subtotal: result.subtotal,
        discount: result.discount,
        cgst: result.cgst,
        sgst: result.sgst,
        igst: result.igst,
        roundOff: result.roundOff,
        totalAmount: result.totalAmount,
        balanceAmount: round2(result.totalAmount - num(invoice.paidAmount)),
      },
    });
  }

  private toItemData(line: LineInput) {
    return {
      bookingId: line.bookingId ?? undefined,
      description: line.description,
      sacCode: line.sacCode ?? undefined,
      quantity: line.quantity,
      rate: line.rate,
      amount: round2(line.quantity * line.rate),
      gstPercent: line.gstPercent,
      gstAmount: 0,
    };
  }

  // =======================================================
  // HELPERS
  // =======================================================

  private async generateInvoiceNo(companyId: string) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { invoicePrefix: true },
    });
    if (!company) throw new NotFoundException('Company not found');

    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;

    return `${company.invoicePrefix}-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private async getInvoice(companyId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  private async getDraftInvoice(companyId: string, id: string) {
    const invoice = await this.getInvoice(companyId, id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Only draft invoices can be modified');
    }
    return invoice;
  }

  /** Validates bookings and turns their charges into invoice lines. */
  private async linesFromBookings(
    companyId: string,
    customerId: string,
    bookingIds: string[],
    excludeInvoiceId?: string,
  ): Promise<LineInput[]> {
    const uniqueIds = [...new Set(bookingIds)];
    if (!uniqueIds.length) return [];

    const bookings = await this.prisma.booking.findMany({
      where: { id: { in: uniqueIds }, companyId, customerId },
    });

    if (bookings.length !== uniqueIds.length) {
      throw new BadRequestException(
        'One or more bookings were not found for this customer',
      );
    }

    const cancelled = bookings.filter((b) => b.status === BookingStatus.CANCELLED);
    if (cancelled.length) {
      throw new BadRequestException(
        `Cancelled bookings cannot be invoiced: ${cancelled.map((b) => b.bookingNo).join(', ')}`,
      );
    }

    const alreadyBilled = await this.prisma.invoiceItem.findMany({
      where: {
        bookingId: { in: uniqueIds },
        invoice: {
          status: { not: InvoiceStatus.CANCELLED },
          ...(excludeInvoiceId ? { id: { not: excludeInvoiceId } } : {}),
        },
      },
      select: { bookingId: true },
    });

    if (alreadyBilled.length) {
      const billed = new Set(alreadyBilled.map((i) => i.bookingId));
      const numbers = bookings.filter((b) => billed.has(b.id)).map((b) => b.bookingNo);
      throw new ConflictException(
        `Already invoiced: ${numbers.join(', ')}`,
      );
    }

    const lines: LineInput[] = [];

    for (const booking of bookings) {
      const route = `${booking.bookingNo} (${booking.pickupCity} to ${booking.dropCity})`;
      const charges: [string, unknown][] = [
        ['Freight charges', booking.freightAmount],
        ['Loading charges', booking.loadingCharges],
        ['Unloading charges', booking.unloadingCharges],
        ['Detention charges', booking.detentionCharges],
        ['Other charges', booking.otherCharges],
      ];

      for (const [label, amount] of charges) {
        if (num(amount) > 0) {
          lines.push({
            bookingId: booking.id,
            description: `${label} - ${route}`,
            quantity: 1,
            rate: num(amount),
            gstPercent: num(booking.gstPercent),
          });
        }
      }
    }

    return lines;
  }

  private async assertBookingBelongsToCustomer(
    companyId: string,
    customerId: string,
    bookingId: string,
  ) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId, customerId },
      select: { id: true },
    });
    if (!booking) {
      throw new BadRequestException('Booking not found for this customer');
    }
  }

  private detailInclude() {
    return {
      customer: true,
      company: {
        select: {
          name: true,
          legalName: true,
          gstin: true,
          pan: true,
          phone: true,
          email: true,
          address: true,
          city: true,
          state: true,
          pincode: true,
          logoUrl: true,
        },
      },
      items: {
        include: {
          booking: {
            select: { id: true, bookingNo: true, pickupCity: true, dropCity: true },
          },
        },
        orderBy: { id: 'asc' as const },
      },
      payments: { orderBy: { paymentDate: 'desc' as const } },
    };
  }

  // =======================================================
  // 20. INVOICES
  // =======================================================

  async create(companyId: string, userId: string, dto: any) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId, isActive: true },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const bookingLines = await this.linesFromBookings(
      companyId,
      dto.customerId,
      dto.bookingIds ?? [],
    );

    const manualLines: LineInput[] = [];
    for (const item of dto.items ?? []) {
      if (item.bookingId) {
        await this.assertBookingBelongsToCustomer(companyId, dto.customerId, item.bookingId);
      }
      manualLines.push({
        bookingId: item.bookingId,
        description: item.description,
        sacCode: item.sacCode,
        quantity: item.quantity ?? 1,
        rate: item.rate,
        gstPercent: item.gstPercent ?? 0,
      });
    }

    const lines = [...bookingLines, ...manualLines];
    if (!lines.length) {
      throw new BadRequestException(
        'Provide at least one booking (bookingIds) or one item',
      );
    }

    const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : new Date();
    const dueDate = dto.dueDate
      ? new Date(dto.dueDate)
      : addDays(invoiceDate, customer.creditDays);

    if (dueDate < invoiceDate) {
      throw new BadRequestException('dueDate cannot be before invoiceDate');
    }

    const invoiceNo = await this.generateInvoiceNo(companyId);

    const invoiceId = await this.prisma.$transaction(async (tx) => {
      const created = await tx.invoice.create({
        data: {
          companyId,
          customerId: dto.customerId,
          createdById: userId,
          invoiceNo,
          invoiceDate,
          dueDate,
          placeOfSupply: dto.placeOfSupply ?? customer.state ?? undefined,
          discount: round2(dto.discount ?? 0),
          notes: dto.notes,
          termsAndConditions: dto.termsAndConditions,
          items: { create: lines.map((line) => this.toItemData(line)) },
        },
      });

      await this.recalculate(tx, created.id);

      if (dto.issue) await this.issueInTx(tx, created.id);

      return created.id;
    });

    return this.findOne(companyId, invoiceId);
  }

  async findAll(companyId: string, query: any = {}) {
    const { page, limit, skip } = pageParams(query);

    // Keep OVERDUE in sync when the list is read (same approach as e-way bills).
    await this.prisma.invoice.updateMany({
      where: {
        companyId,
        status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID] },
        dueDate: { lt: new Date() },
        balanceAmount: { gt: 0 },
      },
      data: { status: InvoiceStatus.OVERDUE },
    });

    const where: Prisma.InvoiceWhereInput = { companyId };

    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;

    const range = dateRange(query.from, query.to);
    if (range) where.invoiceDate = range;

    if (query.search) {
      where.OR = [
        { invoiceNo: { contains: query.search, mode: 'insensitive' } },
        { customer: { name: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: { customer: { select: { id: true, name: true, gstin: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  }

  async findOne(companyId: string, id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, companyId },
      include: this.detailInclude(),
    });
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async update(companyId: string, id: string, dto: any) {
    const invoice = await this.getDraftInvoice(companyId, id);

    const invoiceDate = dto.invoiceDate ? new Date(dto.invoiceDate) : invoice.invoiceDate;
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : invoice.dueDate;

    if (dueDate && dueDate < invoiceDate) {
      throw new BadRequestException('dueDate cannot be before invoiceDate');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          invoiceDate: dto.invoiceDate ? invoiceDate : undefined,
          dueDate: dto.dueDate ? dueDate : undefined,
          placeOfSupply: dto.placeOfSupply,
          discount: dto.discount !== undefined ? round2(dto.discount) : undefined,
          notes: dto.notes,
          termsAndConditions: dto.termsAndConditions,
        },
      });
      await this.recalculate(tx, id);
    });

    return this.findOne(companyId, id);
  }

  /** DRAFT -> ISSUED. Posts the receivable to the customer ledger. */
  private async issueInTx(tx: Prisma.TransactionClient, invoiceId: string) {
    const invoice = await tx.invoice.findUniqueOrThrow({
      where: { id: invoiceId },
      include: { _count: { select: { items: true } } },
    });

    if (invoice._count.items === 0) {
      throw new BadRequestException('Cannot issue an invoice without items');
    }
    if (num(invoice.totalAmount) <= 0) {
      throw new BadRequestException('Cannot issue an invoice with a zero total');
    }

    await tx.invoice.update({
      where: { id: invoiceId },
      data: {
        status: InvoiceStatus.ISSUED,
        balanceAmount: round2(num(invoice.totalAmount) - num(invoice.paidAmount)),
      },
    });

    await this.ledger.post(tx, {
      partyType: LedgerPartyType.CUSTOMER,
      partyId: invoice.customerId,
      entryType: LedgerEntryType.DEBIT,
      amount: num(invoice.totalAmount),
      entryDate: invoice.invoiceDate,
      description: `Invoice ${invoice.invoiceNo}`,
      refType: 'INVOICE',
      refId: invoiceId,
    });
  }

  async issue(companyId: string, id: string) {
    await this.getDraftInvoice(companyId, id);
    await this.prisma.$transaction((tx) => this.issueInTx(tx, id));
    return this.findOne(companyId, id);
  }

  async cancel(companyId: string, id: string, reason?: string) {
    const invoice = await this.getInvoice(companyId, id);

    if (invoice.status === InvoiceStatus.CANCELLED) {
      throw new BadRequestException('Invoice is already cancelled');
    }
    if (num(invoice.paidAmount) > 0) {
      throw new BadRequestException(
        'This invoice has payments. Reverse the payments before cancelling it.',
      );
    }

    const wasPosted = invoice.status !== InvoiceStatus.DRAFT;

    await this.prisma.$transaction(async (tx) => {
      await tx.invoice.update({
        where: { id },
        data: {
          status: InvoiceStatus.CANCELLED,
          balanceAmount: 0,
          notes: reason
            ? `${invoice.notes ? `${invoice.notes}\n` : ''}Cancelled: ${reason}`
            : invoice.notes,
        },
      });

      if (wasPosted) {
        await this.ledger.post(tx, {
          partyType: LedgerPartyType.CUSTOMER,
          partyId: invoice.customerId,
          entryType: LedgerEntryType.CREDIT,
          amount: num(invoice.totalAmount),
          description: `Invoice ${invoice.invoiceNo} cancelled`,
          refType: 'INVOICE_CANCEL',
          refId: id,
        });
      }
    });

    return this.findOne(companyId, id);
  }

  async remove(companyId: string, id: string) {
    await this.getDraftInvoice(companyId, id);
    await this.prisma.invoice.delete({ where: { id } }); // items cascade
    return { message: 'Draft invoice deleted' };
  }

  // =======================================================
  // PAYMENT STATE  (called by CustomerPayments in its transaction)
  // =======================================================

  /**
   * Recomputes paidAmount / balanceAmount / status from the payment rows,
   * so it is safe for both payment creation and reversal.
   */
  async syncPaymentStatus(tx: Prisma.TransactionClient, invoiceId: string) {
    const invoice = await tx.invoice.findUniqueOrThrow({ where: { id: invoiceId } });

    const aggregate = await tx.payment.aggregate({
      where: { invoiceId },
      _sum: { amount: true },
    });

    const paid = round2(num(aggregate._sum.amount));
    const total = num(invoice.totalAmount);
    const balance = round2(total - paid);

    let status: InvoiceStatus;
    if (balance <= 0) {
      status = InvoiceStatus.PAID;
    } else {
      const overdue = invoice.dueDate !== null && invoice.dueDate < new Date();
      if (overdue) status = InvoiceStatus.OVERDUE;
      else if (paid > 0) status = InvoiceStatus.PARTIALLY_PAID;
      else status = InvoiceStatus.ISSUED;
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: { paidAmount: paid, balanceAmount: balance, status },
    });
  }

  // =======================================================
  // 21. INVOICE ITEMS  (draft invoices only)
  // =======================================================

  async addItem(companyId: string, invoiceId: string, dto: any) {
    const invoice = await this.getDraftInvoice(companyId, invoiceId);

    if (dto.bookingId) {
      await this.assertBookingBelongsToCustomer(companyId, invoice.customerId, dto.bookingId);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.create({
        data: {
          invoiceId,
          ...this.toItemData({
            bookingId: dto.bookingId,
            description: dto.description,
            sacCode: dto.sacCode,
            quantity: dto.quantity ?? 1,
            rate: dto.rate,
            gstPercent: dto.gstPercent ?? 0,
          }),
        },
      });
      await this.recalculate(tx, invoiceId);
    });

    return this.findOne(companyId, invoiceId);
  }

  /** Adds all unbilled charges of more bookings to a draft invoice. */
  async addBookings(companyId: string, invoiceId: string, bookingIds: string[]) {
    const invoice = await this.getDraftInvoice(companyId, invoiceId);

    const lines = await this.linesFromBookings(
      companyId,
      invoice.customerId,
      bookingIds,
      invoiceId,
    );

    // A booking already on this same draft must not be added twice.
    const existing = await this.prisma.invoiceItem.findMany({
      where: { invoiceId, bookingId: { in: bookingIds } },
      select: { bookingId: true },
    });
    if (existing.length) {
      throw new ConflictException('One or more bookings are already on this invoice');
    }

    if (!lines.length) {
      throw new BadRequestException('The selected bookings have no billable charges');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.createMany({
        data: lines.map((line) => ({ invoiceId, ...this.toItemData(line) })),
      });
      await this.recalculate(tx, invoiceId);
    });

    return this.findOne(companyId, invoiceId);
  }

  async updateItem(companyId: string, invoiceId: string, itemId: string, dto: any) {
    const invoice = await this.getDraftInvoice(companyId, invoiceId);

    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
    });
    if (!item) throw new NotFoundException('Invoice item not found');

    if (dto.bookingId) {
      await this.assertBookingBelongsToCustomer(companyId, invoice.customerId, dto.bookingId);
    }

    const quantity = dto.quantity ?? num(item.quantity);
    const rate = dto.rate ?? num(item.rate);

    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.update({
        where: { id: itemId },
        data: {
          bookingId: dto.bookingId,
          description: dto.description,
          sacCode: dto.sacCode,
          quantity,
          rate,
          amount: round2(quantity * rate),
          gstPercent: dto.gstPercent,
        },
      });
      await this.recalculate(tx, invoiceId);
    });

    return this.findOne(companyId, invoiceId);
  }

  async removeItem(companyId: string, invoiceId: string, itemId: string) {
    await this.getDraftInvoice(companyId, invoiceId);

    const item = await this.prisma.invoiceItem.findFirst({
      where: { id: itemId, invoiceId },
    });
    if (!item) throw new NotFoundException('Invoice item not found');

    await this.prisma.$transaction(async (tx) => {
      await tx.invoiceItem.delete({ where: { id: itemId } });
      await this.recalculate(tx, invoiceId);
    });

    return this.findOne(companyId, invoiceId);
  }
}
