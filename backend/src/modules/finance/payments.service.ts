import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../database/prisma.service.js';
import { Prisma } from '../../generated/prisma/client.js';
import {
  InvoiceStatus,
  LedgerEntryType,
  LedgerPartyType,
  PaymentType,
} from '../../generated/prisma/enums.js';
import { InvoicesService } from './invoices.service.js';
import { LedgerService } from './ledger.service.js';
import { dateRange, num, pageParams, round2 } from './finance.utils.js';

const PAYABLE_INVOICE_STATUSES: InvoiceStatus[] = [
  InvoiceStatus.ISSUED,
  InvoiceStatus.PARTIALLY_PAID,
  InvoiceStatus.OVERDUE,
];

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoices: InvoicesService,
    private readonly ledger: LedgerService,
  ) {}

  private generateReceiptNo() {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    return `RCT-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  // =======================================================
  // 22. CUSTOMER PAYMENTS (money received)
  // =======================================================

  async createCustomerPayment(companyId: string, userId: string, dto: any) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: dto.customerId, companyId },
    });
    if (!customer) throw new NotFoundException('Customer not found');

    const amount = round2(dto.amount);

    let invoiceBalance: number | null = null;
    if (dto.invoiceId) {
      const invoice = await this.prisma.invoice.findFirst({
        where: { id: dto.invoiceId, companyId, customerId: dto.customerId },
      });
      if (!invoice) throw new NotFoundException('Invoice not found for this customer');

      if (!PAYABLE_INVOICE_STATUSES.includes(invoice.status as InvoiceStatus)) {
        throw new BadRequestException(
          `Payments cannot be recorded against a ${invoice.status} invoice`,
        );
      }

      invoiceBalance = num(invoice.balanceAmount);
      if (amount > invoiceBalance) {
        throw new BadRequestException(
          `Amount exceeds the invoice balance of ${invoiceBalance.toFixed(2)}`,
        );
      }
    }

    if (dto.bookingId) {
      const booking = await this.prisma.booking.findFirst({
        where: { id: dto.bookingId, companyId, customerId: dto.customerId },
        select: { id: true },
      });
      if (!booking) throw new BadRequestException('Booking not found for this customer');
    }

    const type: PaymentType =
      dto.type ??
      (invoiceBalance === null
        ? PaymentType.ADVANCE
        : amount >= invoiceBalance
          ? PaymentType.FULL_PAYMENT
          : PaymentType.PART_PAYMENT);

    const paymentId = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          invoiceId: dto.invoiceId,
          bookingId: dto.bookingId,
          recordedById: userId,
          type,
          mode: dto.mode,
          amount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          referenceNo: dto.referenceNo,
          bankName: dto.bankName,
          receiptNo: this.generateReceiptNo(),
          remarks: dto.remarks,
        },
      });

      if (dto.invoiceId) {
        const updated = await this.invoices.syncPaymentStatus(tx, dto.invoiceId);
        // Guards against two concurrent payments overpaying the same invoice.
        if (num(updated.balanceAmount) < 0) {
          throw new BadRequestException('Payment exceeds the invoice balance');
        }
      } else if (dto.bookingId && type === PaymentType.ADVANCE) {
        await tx.booking.update({
          where: { id: dto.bookingId },
          data: { advanceReceived: { increment: amount } },
        });
      }

      await this.ledger.post(tx, {
        partyType: LedgerPartyType.CUSTOMER,
        partyId: dto.customerId,
        entryType: LedgerEntryType.CREDIT,
        amount,
        entryDate: payment.paymentDate,
        description: payment.receiptNo
          ? `Payment received ${payment.receiptNo}`
          : 'Payment received',
        refType: 'PAYMENT',
        refId: payment.id,
      });

      return payment.id;
    });

    return this.findCustomerPayment(companyId, paymentId);
  }

  async findAllCustomerPayments(companyId: string, query: any = {}) {
    const { page, limit, skip } = pageParams(query);

    const where: Prisma.PaymentWhereInput = { customer: { companyId } };
    if (query.customerId) where.customerId = query.customerId;
    if (query.invoiceId) where.invoiceId = query.invoiceId;
    if (query.mode) where.mode = query.mode;

    const range = dateRange(query.from, query.to);
    if (range) where.paymentDate = range;

    const [data, total, sum] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true } },
          invoice: { select: { id: true, invoiceNo: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.payment.count({ where }),
      this.prisma.payment.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      data,
      pagination: { page, limit, total },
      totalReceived: round2(num(sum._sum.amount)),
    };
  }

  async findCustomerPayment(companyId: string, id: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { id, customer: { companyId } },
      include: {
        customer: { select: { id: true, name: true } },
        invoice: {
          select: {
            id: true,
            invoiceNo: true,
            totalAmount: true,
            paidAmount: true,
            balanceAmount: true,
            status: true,
          },
        },
        booking: { select: { id: true, bookingNo: true } },
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  /** Reverses a payment: removes its ledger entry and rolls the invoice back. */
  async deleteCustomerPayment(companyId: string, id: string) {
    const payment = await this.findCustomerPayment(companyId, id);

    await this.prisma.$transaction(async (tx) => {
      await this.ledger.removeByRef(tx, ['PAYMENT'], id);

      if (!payment.invoiceId && payment.bookingId && payment.type === PaymentType.ADVANCE) {
        const booking = await tx.booking.findUniqueOrThrow({
          where: { id: payment.bookingId },
          select: { advanceReceived: true },
        });
        await tx.booking.update({
          where: { id: payment.bookingId },
          data: {
            advanceReceived: Math.max(
              round2(num(booking.advanceReceived) - num(payment.amount)),
              0,
            ),
          },
        });
      }

      await tx.payment.delete({ where: { id } });

      if (payment.invoiceId) {
        await this.invoices.syncPaymentStatus(tx, payment.invoiceId);
      }
    });

    return { message: 'Payment reversed' };
  }

  // =======================================================
  // 23. VENDOR PAYMENTS (money paid out)
  // =======================================================

  async createVendorPayment(companyId: string, dto: any) {
    const vendor = await this.prisma.vendor.findFirst({
      where: { id: dto.vendorId, companyId },
    });
    if (!vendor) throw new NotFoundException('Vendor not found');

    const amount = round2(dto.amount);
    let type: PaymentType | undefined = dto.type;

    if (dto.tripId) {
      const trip = await this.prisma.trip.findFirst({
        where: { id: dto.tripId, companyId },
      });
      if (!trip) throw new NotFoundException('Trip not found');

      if (trip.vendorId !== dto.vendorId) {
        throw new BadRequestException('This trip does not belong to the selected vendor');
      }

      const hire = num(trip.hireCharges);
      if (hire > 0) {
        const paidSoFar = await this.prisma.vendorPayment.aggregate({
          where: { tripId: dto.tripId },
          _sum: { amount: true },
        });
        const remaining = round2(hire - num(paidSoFar._sum.amount));

        if (amount > remaining) {
          throw new BadRequestException(
            `Amount exceeds the unpaid hire charges of ${remaining.toFixed(2)} for this trip`,
          );
        }

        type ??= amount >= remaining ? PaymentType.FULL_PAYMENT : PaymentType.PART_PAYMENT;
      }
    }

    const payment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.vendorPayment.create({
        data: {
          vendorId: dto.vendorId,
          tripId: dto.tripId,
          type,
          mode: dto.mode,
          amount,
          paymentDate: dto.paymentDate ? new Date(dto.paymentDate) : new Date(),
          referenceNo: dto.referenceNo,
          remarks: dto.remarks,
        },
      });

      if (dto.tripId && created.type === PaymentType.ADVANCE) {
        await tx.trip.update({
          where: { id: dto.tripId },
          data: { hireAdvancePaid: { increment: amount } },
        });
      }

      await this.ledger.post(tx, {
        partyType: LedgerPartyType.VENDOR,
        partyId: dto.vendorId,
        entryType: LedgerEntryType.DEBIT,
        amount,
        entryDate: created.paymentDate,
        description: dto.referenceNo
          ? `Payment to vendor (${dto.referenceNo})`
          : 'Payment to vendor',
        refType: 'VENDOR_PAYMENT',
        refId: created.id,
      });

      return created;
    });

    return this.findVendorPayment(companyId, payment.id);
  }

  async findAllVendorPayments(companyId: string, query: any = {}) {
    const { page, limit, skip } = pageParams(query);

    const where: Prisma.VendorPaymentWhereInput = { vendor: { companyId } };
    if (query.vendorId) where.vendorId = query.vendorId;
    if (query.tripId) where.tripId = query.tripId;
    if (query.mode) where.mode = query.mode;

    const range = dateRange(query.from, query.to);
    if (range) where.paymentDate = range;

    const [data, total, sum] = await Promise.all([
      this.prisma.vendorPayment.findMany({
        where,
        include: {
          vendor: { select: { id: true, name: true } },
          trip: { select: { id: true, tripNo: true } },
        },
        orderBy: { paymentDate: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.vendorPayment.count({ where }),
      this.prisma.vendorPayment.aggregate({ where, _sum: { amount: true } }),
    ]);

    return {
      data,
      pagination: { page, limit, total },
      totalPaid: round2(num(sum._sum.amount)),
    };
  }

  async findVendorPayment(companyId: string, id: string) {
    const payment = await this.prisma.vendorPayment.findFirst({
      where: { id, vendor: { companyId } },
      include: {
        vendor: { select: { id: true, name: true } },
        trip: {
          select: { id: true, tripNo: true, hireCharges: true, hireAdvancePaid: true },
        },
      },
    });
    if (!payment) throw new NotFoundException('Vendor payment not found');
    return payment;
  }

  async deleteVendorPayment(companyId: string, id: string) {
    const payment = await this.findVendorPayment(companyId, id);

    await this.prisma.$transaction(async (tx) => {
      await this.ledger.removeByRef(tx, ['VENDOR_PAYMENT'], id);

      if (payment.tripId && payment.type === PaymentType.ADVANCE) {
        const trip = await tx.trip.findUniqueOrThrow({
          where: { id: payment.tripId },
          select: { hireAdvancePaid: true },
        });
        await tx.trip.update({
          where: { id: payment.tripId },
          data: {
            hireAdvancePaid: Math.max(
              round2(num(trip.hireAdvancePaid) - num(payment.amount)),
              0,
            ),
          },
        });
      }

      await tx.vendorPayment.delete({ where: { id } });
    });

    return { message: 'Vendor payment reversed' };
  }
}
