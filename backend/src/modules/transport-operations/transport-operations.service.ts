import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

// import { PrismaService } from '../../prisma/prisma.service.js';

import {
  BookingStatus,
  TripStatus,
  VehicleStatus,
  DriverStatus,
  PodStatus,
  EwayBillStatus,
} from '../../generated/prisma/enums.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class TransportOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  // -------------------------------------------------------
  // COMMON HELPERS
  // -------------------------------------------------------

  private async getBooking(companyId: string, bookingId: string) {
    const booking = await this.prisma.booking.findFirst({
      where: { id: bookingId, companyId },
      include: {
        customer: true,
        items: true,
        statusHistory: { orderBy: { createdAt: 'desc' } },
        lorryReceipts: true,
        tripBookings: { include: { trip: true } },
      },
    });

    if (!booking) throw new NotFoundException('Booking not found');
    return booking;
  }

  private async getTrip(companyId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, companyId },
      include: {
        vehicle: true,
        driver: true,
        vendor: true,
        bookings: { include: { booking: true } },
        expenses: true,
        fuelEntries: true,
        lorryReceipts: true,
      },
    });

    if (!trip) throw new NotFoundException('Trip not found');
    return trip;
  }

  private async generateNumber(
    companyId: string,
    field: 'bookingPrefix' | 'lrPrefix' | 'tripPrefix',
  ) {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { [field]: true },
    });

    if (!company) throw new NotFoundException('Company not found');

    const prefix = (company as any)[field];
    const date = new Date();
    const datePart = `${date.getFullYear()}${String(
      date.getMonth() + 1,
    ).padStart(2, '0')}`;

    // UUID suffix prevents collisions when multiple requests run together.
    return `${prefix}-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private async validateCustomer(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId, isActive: true },
    });

    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  private async validateBranch(companyId: string, branchId?: string) {
    if (!branchId) return;

    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, companyId, isActive: true },
    });

    if (!branch) throw new BadRequestException('Invalid branch');
  }

  private async validateVehicle(companyId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId, isActive: true },
    });

    if (!vehicle) throw new NotFoundException('Vehicle not found');
    return vehicle;
  }

  private async validateDriver(companyId: string, driverId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId, isActive: true },
    });

    if (!driver) throw new NotFoundException('Driver not found');
    return driver;
  }

  private async recalculateTrip(tripId: string) {
    const [trip, expenseAggregate, fuelAggregate, bookingAggregate] =
      await Promise.all([
        this.prisma.trip.findUnique({ where: { id: tripId } }),
        this.prisma.tripExpense.aggregate({
          where: { tripId },
          _sum: { amount: true },
        }),
        this.prisma.fuelEntry.aggregate({
          where: { tripId },
          _sum: { totalAmount: true },
        }),
        this.prisma.tripBooking.findMany({
          where: { tripId },
          include: { booking: { select: { freightAmount: true } } },
        }),
      ]);

    if (!trip) throw new NotFoundException('Trip not found');

    const expense = Number(expenseAggregate._sum.amount ?? 0);
    const fuel = Number(fuelAggregate._sum.totalAmount ?? 0);
    const revenue = bookingAggregate.reduce(
      (sum: any, item: any) => sum + Number(item.booking.freightAmount),
      0,
    );

    const totalExpense = expense + fuel + Number(trip.hireCharges);
    const profit = revenue - totalExpense;

    return this.prisma.trip.update({
      where: { id: tripId },
      data: { totalRevenue: revenue, totalExpense, profit },
    });
  }

  // =======================================================
  // 11 + 12 + 13. BOOKINGS, ITEMS & STATUS HISTORY
  // =======================================================

  async createBooking(companyId: string, userId: string, dto: any) {
    await this.validateCustomer(companyId, dto.customerId);
    await this.validateBranch(companyId, dto.branchId);

    if (dto.routeId) {
      const route = await this.prisma.route.findFirst({
        where: { id: dto.routeId, companyId, isActive: true },
      });
      if (!route) throw new BadRequestException('Invalid route');
    }

    if (dto.quotationId) {
      const quotation = await this.prisma.quotation.findFirst({
        where: {
          id: dto.quotationId,
          customerId: dto.customerId,
          customer: { companyId },
          status: 'ACCEPTED',
        },
      });
      if (!quotation) {
        throw new BadRequestException(
          'Quotation not found, or it has not been accepted',
        );
      }
    }

    const items = dto.items ?? [];
    const totalWeightKg = items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.weightKg ?? 0) * Number(item.quantity ?? 1),
      0,
    );
    const totalPackages = items.reduce(
      (sum: number, item: any) => sum + Number(item.quantity ?? 1),
      0,
    );
    const declaredValue = items.reduce(
      (sum: number, item: any) =>
        sum + Number(item.value ?? 0) * Number(item.quantity ?? 1),
      0,
    );

    const freight = Number(dto.freightAmount ?? 0);
    const loading = Number(dto.loadingCharges ?? 0);
    const unloading = Number(dto.unloadingCharges ?? 0);
    const detention = Number(dto.detentionCharges ?? 0);
    const other = Number(dto.otherCharges ?? 0);
    const gstPercent = Number(dto.gstPercent ?? 0);

    const taxable = freight + loading + unloading + detention + other;
    const gstAmount = (taxable * gstPercent) / 100;
    const totalAmount = taxable + gstAmount;

    const bookingNo = await this.generateNumber(companyId, 'bookingPrefix');

    return this.prisma.booking.create({
      data: {
        companyId,
        branchId: dto.branchId,
        bookingNo,
        customerId: dto.customerId,
        quotationId: dto.quotationId,
        routeId: dto.routeId,
        createdById: userId,
        pickupDate: dto.pickupDate ? new Date(dto.pickupDate) : undefined,
        expectedDeliveryDate: dto.expectedDeliveryDate
          ? new Date(dto.expectedDeliveryDate)
          : undefined,

        pickupAddress: dto.pickupAddress,
        pickupCity: dto.pickupCity,
        pickupState: dto.pickupState,
        pickupPincode: dto.pickupPincode,
        pickupContactName: dto.pickupContactName,
        pickupContactPhone: dto.pickupContactPhone,

        dropAddress: dto.dropAddress,
        dropCity: dto.dropCity,
        dropState: dto.dropState,
        dropPincode: dto.dropPincode,
        dropContactName: dto.dropContactName,
        dropContactPhone: dto.dropContactPhone,

        consignorName: dto.consignorName,
        consignorGstin: dto.consignorGstin,
        consigneeName: dto.consigneeName,
        consigneeGstin: dto.consigneeGstin,

        goodsType: dto.goodsType,
        goodsDescription: dto.goodsDescription,
        totalWeightKg,
        totalPackages,
        declaredValue,
        requiredVehicleType: dto.requiredVehicleType,

        paymentTerms: dto.paymentTerms ?? 'TO_BE_BILLED',
        freightAmount: freight,
        loadingCharges: loading,
        unloadingCharges: unloading,
        detentionCharges: detention,
        otherCharges: other,
        gstPercent,
        gstAmount,
        totalAmount,
        advanceReceived: Number(dto.advanceReceived ?? 0),
        remarks: dto.remarks,

        items: {
          create: items.map((item: any) => ({
            description: item.description,
            quantity: item.quantity ?? 1,
            unit: item.unit,
            weightKg: item.weightKg,
            volumeCuft: item.volumeCuft,
            value: item.value,
          })),
        },

        statusHistory: {
          create: {
            status: BookingStatus.PENDING,
            changedBy: userId,
            remarks: 'Booking created',
          },
        },
      },
      include: { items: true, statusHistory: true, customer: true },
    });
  }

  async findAllBookings(companyId: string, query: any = {}) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);

    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.customerId) where.customerId = query.customerId;
    if (query.branchId) where.branchId = query.branchId;

    if (query.search) {
      where.OR = [
        { bookingNo: { contains: query.search, mode: 'insensitive' } },
        { pickupCity: { contains: query.search, mode: 'insensitive' } },
        { dropCity: { contains: query.search, mode: 'insensitive' } },
        {
          customer: {
            name: { contains: query.search, mode: 'insensitive' },
          },
        },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        include: { customer: true, items: true },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.booking.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  }

  async findBooking(companyId: string, bookingId: string) {
    return this.getBooking(companyId, bookingId);
  }

  async updateBooking(companyId: string, bookingId: string, dto: any) {
    const booking = await this.getBooking(companyId, bookingId);

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.CLOSED
    ) {
      throw new BadRequestException('This booking cannot be edited');
    }

    if (dto.customerId) {
      await this.validateCustomer(companyId, dto.customerId);
    }
    if (dto.branchId) await this.validateBranch(companyId, dto.branchId);

    const { items, ...data } = dto;

    // Recalculate goods totals only when the items array is supplied.
    if (items) {
      const totalWeightKg = items.reduce(
        (sum: number, item: any) =>
          sum + Number(item.weightKg ?? 0) * Number(item.quantity ?? 1),
        0,
      );
      const totalPackages = items.reduce(
        (sum: number, item: any) => sum + Number(item.quantity ?? 1),
        0,
      );
      const declaredValue = items.reduce(
        (sum: number, item: any) =>
          sum + Number(item.value ?? 0) * Number(item.quantity ?? 1),
        0,
      );

      data.totalWeightKg = totalWeightKg;
      data.totalPackages = totalPackages;
      data.declaredValue = declaredValue;
    }

    const freight = Number(data.freightAmount ?? booking.freightAmount);
    const loading = Number(data.loadingCharges ?? booking.loadingCharges);
    const unloading = Number(data.unloadingCharges ?? booking.unloadingCharges);
    const detention = Number(data.detentionCharges ?? booking.detentionCharges);
    const other = Number(data.otherCharges ?? booking.otherCharges);
    const gstPercent = Number(data.gstPercent ?? booking.gstPercent);
    const taxable = freight + loading + unloading + detention + other;
    data.gstAmount = (taxable * gstPercent) / 100;
    data.totalAmount = taxable + data.gstAmount;

    return this.prisma.$transaction(async (tx: any) => {
      if (items) {
        await tx.bookingItem.deleteMany({ where: { bookingId } });
      }

      return tx.booking.update({
        where: { id: bookingId },
        data: {
          ...data,
          pickupDate: data.pickupDate ? new Date(data.pickupDate) : undefined,
          expectedDeliveryDate: data.expectedDeliveryDate
            ? new Date(data.expectedDeliveryDate)
            : undefined,
          items: items
            ? {
                create: items.map((item: any) => ({
                  description: item.description,
                  quantity: item.quantity ?? 1,
                  unit: item.unit,
                  weightKg: item.weightKg,
                  volumeCuft: item.volumeCuft,
                  value: item.value,
                })),
              }
            : undefined,
        },
        include: { items: true },
      });
    });
  }

  async changeBookingStatus(
    companyId: string,
    userId: string,
    bookingId: string,
    dto: any,
  ) {
    const booking = await this.getBooking(companyId, bookingId);
    const next = dto.status as BookingStatus;

    const allowed: Record<string, string[]> = {
      PENDING: ['CONFIRMED', 'CANCELLED'],
      CONFIRMED: ['DISPATCHED', 'CANCELLED'],
      DISPATCHED: ['IN_TRANSIT', 'CANCELLED'],
      IN_TRANSIT: ['DELIVERED'],
      DELIVERED: ['CLOSED'],
      CLOSED: [],
      CANCELLED: [],
    };

    if (!allowed[booking.status]?.includes(next)) {
      throw new BadRequestException(
        `Cannot change booking status from ${booking.status} to ${next}`,
      );
    }

    if (next === BookingStatus.CANCELLED && !dto.cancelReason) {
      throw new BadRequestException('cancelReason is required');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          status: next,
          cancelReason:
            next === BookingStatus.CANCELLED ? dto.cancelReason : undefined,
          actualDeliveryDate:
            next === BookingStatus.DELIVERED ? new Date() : undefined,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          status: next,
          changedBy: userId,
          remarks: dto.remarks ?? dto.cancelReason,
        },
      });

      return updated;
    });
  }

  async getBookingHistory(companyId: string, bookingId: string) {
    await this.getBooking(companyId, bookingId);

    return this.prisma.bookingStatusHistory.findMany({
      where: { bookingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =======================================================
  // 14. LORRY RECEIPTS
  // =======================================================

  async createLorryReceipt(companyId: string, dto: any) {
    const booking = await this.getBooking(companyId, dto.bookingId);

    if (
      booking.status === BookingStatus.CANCELLED ||
      booking.status === BookingStatus.CLOSED
    ) {
      throw new BadRequestException(
        'Cannot generate LR for cancelled or closed booking',
      );
    }

    if (dto.tripId) await this.getTrip(companyId, dto.tripId);

    const existing = await this.prisma.lorryReceipt.findFirst({
      where: { bookingId: dto.bookingId },
    });

    if (existing) {
      throw new ConflictException('An LR already exists for this booking');
    }

    const lrNo = await this.generateNumber(companyId, 'lrPrefix');

    return this.prisma.lorryReceipt.create({
      data: {
        ...dto,
        lrNo,
        lrDate: dto.lrDate ? new Date(dto.lrDate) : new Date(),
        actualWeightKg: dto.actualWeightKg,
        chargedWeightKg: dto.chargedWeightKg,
        goodsValue: dto.goodsValue,
        freight: dto.freight ?? booking.freightAmount,
        paymentTerms: dto.paymentTerms ?? booking.paymentTerms,
      },
      include: { booking: true, trip: true },
    });
  }

  async findAllLorryReceipts(companyId: string) {
    return this.prisma.lorryReceipt.findMany({
      where: { booking: { companyId } },
      include: { booking: true, trip: true, ewayBills: true, pod: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findLorryReceipt(companyId: string, id: string) {
    const lr = await this.prisma.lorryReceipt.findFirst({
      where: { id, booking: { companyId } },
      include: { booking: true, trip: true, ewayBills: true, pod: true },
    });

    if (!lr) throw new NotFoundException('Lorry receipt not found');
    return lr;
  }

  // =======================================================
  // 15. E-WAY BILLS
  // =======================================================

  async createEwayBill(companyId: string, dto: any) {
    const lr = await this.findLorryReceipt(companyId, dto.lorryReceiptId);

    if (new Date(dto.validUntil) <= new Date(dto.generatedAt)) {
      throw new BadRequestException('validUntil must be after generatedAt');
    }

    if (
      lr.ewayBills.some((bill: any) => bill.status === EwayBillStatus.ACTIVE)
    ) {
      throw new ConflictException(
        'An active E-Way Bill already exists for this LR',
      );
    }

    return this.prisma.ewayBill.create({
      data: {
        ...dto,
        generatedAt: new Date(dto.generatedAt),
        validUntil: new Date(dto.validUntil),
        status: dto.status ?? EwayBillStatus.ACTIVE,
      },
      include: { lorryReceipt: true },
    });
  }

  async findAllEwayBills(companyId: string, query: any = {}) {
    const where: any = { lorryReceipt: { booking: { companyId } } };

    if (query.status) where.status = query.status;
    if (query.lorryReceiptId) {
      where.lorryReceiptId = query.lorryReceiptId;
    }

    const bills = await this.prisma.ewayBill.findMany({
      where,
      include: { lorryReceipt: true },
      orderBy: { validUntil: 'asc' },
    });

    // Synchronize expired statuses when records are read.
    const now = new Date();
    const expiredIds = bills
      .filter(
        (bill: any) =>
          bill.status === EwayBillStatus.ACTIVE && bill.validUntil < now,
      )
      .map((bill: any) => bill.id);

    if (expiredIds.length) {
      await this.prisma.ewayBill.updateMany({
        where: { id: { in: expiredIds } },
        data: { status: EwayBillStatus.EXPIRED },
      });
    }

    return this.prisma.ewayBill.findMany({
      where,
      include: { lorryReceipt: true },
      orderBy: { validUntil: 'asc' },
    });
  }

  async updateEwayBill(companyId: string, id: string, dto: any) {
    const bill = await this.prisma.ewayBill.findFirst({
      where: { id, lorryReceipt: { booking: { companyId } } },
    });

    if (!bill) throw new NotFoundException('E-Way Bill not found');

    if (dto.validUntil && new Date(dto.validUntil) <= bill.generatedAt) {
      throw new BadRequestException('validUntil must be after generatedAt');
    }

    return this.prisma.ewayBill.update({
      where: { id },
      data: {
        ...dto,
        generatedAt: dto.generatedAt ? new Date(dto.generatedAt) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });
  }

  // =======================================================
  // 16. PROOF OF DELIVERY
  // =======================================================

  async createPod(companyId: string, dto: any) {
    await this.findLorryReceipt(companyId, dto.lorryReceiptId);

    const existing = await this.prisma.proofOfDelivery.findUnique({
      where: { lorryReceiptId: dto.lorryReceiptId },
    });

    if (existing) {
      throw new ConflictException('POD already exists for this LR');
    }

    return this.prisma.proofOfDelivery.create({
      data: {
        ...dto,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : undefined,
        photoUrls: dto.photoUrls ?? [],
      },
      include: { lorryReceipt: true },
    });
  }

  async updatePod(companyId: string, id: string, dto: any) {
    const pod = await this.prisma.proofOfDelivery.findFirst({
      where: { id, lorryReceipt: { booking: { companyId } } },
    });

    if (!pod) throw new NotFoundException('POD not found');

    if (pod.status === PodStatus.VERIFIED) {
      throw new BadRequestException('Verified POD cannot be edited');
    }

    return this.prisma.proofOfDelivery.update({
      where: { id },
      data: {
        ...dto,
        deliveredAt: dto.deliveredAt ? new Date(dto.deliveredAt) : undefined,
      },
    });
  }

  async verifyPod(companyId: string, userId: string, id: string) {
    const pod = await this.prisma.proofOfDelivery.findFirst({
      where: { id, lorryReceipt: { booking: { companyId } } },
      include: { lorryReceipt: true },
    });

    if (!pod) throw new NotFoundException('POD not found');

    if (pod.status !== PodStatus.RECEIVED) {
      throw new BadRequestException('POD must be RECEIVED before verification');
    }

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.proofOfDelivery.update({
        where: { id },
        data: {
          status: PodStatus.VERIFIED,
          verifiedBy: userId,
          verifiedAt: new Date(),
        },
      });

      await tx.booking.update({
        where: { id: pod.lorryReceipt.bookingId },
        data: {
          status: BookingStatus.DELIVERED,
          actualDeliveryDate: pod.deliveredAt ?? new Date(),
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId: pod.lorryReceipt.bookingId,
          status: BookingStatus.DELIVERED,
          changedBy: userId,
          remarks: 'Delivery verified through POD',
        },
      });

      return updated;
    });
  }

  async findAllPods(companyId: string) {
    return this.prisma.proofOfDelivery.findMany({
      where: { lorryReceipt: { booking: { companyId } } },
      include: { lorryReceipt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =======================================================
  // 17. TRIPS / DISPATCH
  // =======================================================


async createTrip(companyId: string, userId: string, dto: any) {
  // 1. Validate branch
  await this.validateBranch(companyId, dto.branchId);

  // 2. Validate vehicle
  const vehicle = await this.validateVehicle(
    companyId,
    dto.vehicleId,
  );

  // 3. Validate driver
  const driver = await this.validateDriver(
    companyId,
    dto.driverId,
  );

  // 4. Check vehicle availability
  if (vehicle.status !== VehicleStatus.AVAILABLE) {
    throw new ConflictException('Vehicle is not available');
  }

  // 5. Check driver availability
  if (driver.status !== DriverStatus.ACTIVE) {
    throw new ConflictException('Driver is not available');
  }

  // 6. Validate vendor if provided
  if (dto.vendorId) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id: dto.vendorId,
        companyId,
        isActive: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }
  }

  // 7. Get booking IDs
  const bookingIds: string[] = dto.bookingIds ?? [];

  // 8. Validate bookings
  const bookings = bookingIds.length
    ? await this.prisma.booking.findMany({
        where: {
          id: { in: bookingIds },
          companyId,
          status: {
            in: [
              BookingStatus.CONFIRMED,
              BookingStatus.DISPATCHED,
            ],
          },
        },
      })
    : [];

  if (bookings.length !== bookingIds.length) {
    throw new BadRequestException(
      'One or more bookings are invalid or not ready for dispatch',
    );
  }

  // 9. Generate trip number
  const tripNo = await this.generateNumber(
    companyId,
    'tripPrefix',
  );

  // 10. Create trip and update related records in transaction
  return this.prisma.$transaction(async (tx: any) => {

    // 10.1 Prevent booking from being assigned to another active trip
    if (bookingIds.length > 0) {
      const existingAssignments =
        await tx.tripBooking.findMany({
          where: {
            bookingId: {
              in: bookingIds,
            },
            trip: {
              companyId,
              status: {
                notIn: [
                  TripStatus.COMPLETED,
                  TripStatus.CANCELLED,
                ],
              },
            },
          },
          select: {
            bookingId: true,
          },
        });

      if (existingAssignments.length > 0) {
        throw new ConflictException(
          'One or more bookings are already assigned to an active trip',
        );
      }
    }

    // 10.2 Create trip with booking relationships
    const trip = await tx.trip.create({
      data: {
        companyId,
        branchId: dto.branchId,
        tripNo,

        vehicleId: dto.vehicleId,
        driverId: dto.driverId,
        vendorId: dto.vendorId,

        createdById: userId,

        originCity: dto.originCity,
        destCity: dto.destCity,

        plannedStart: dto.plannedStart
          ? new Date(dto.plannedStart)
          : undefined,

        plannedEnd: dto.plannedEnd
          ? new Date(dto.plannedEnd)
          : undefined,

        startOdometer: dto.startOdometer,
        distanceKm: dto.distanceKm,
        loadWeightKg: dto.loadWeightKg,

        hireCharges: dto.hireCharges ?? 0,
        hireAdvancePaid: dto.hireAdvancePaid ?? 0,
        driverAdvance: dto.driverAdvance ?? 0,

        remarks: dto.remarks,

        // Create TripBooking records
        bookings: {
          create: bookingIds.map((bookingId) => ({
            bookingId,
          })),
        },
      },

      include: {
        vehicle: true,
        driver: true,
        bookings: {
          include: {
            booking: true,
          },
        },
      },
    });

    // 10.3 Update vehicle status
    await tx.vehicle.update({
      where: {
        id: dto.vehicleId,
      },
      data: {
        status: VehicleStatus.ON_TRIP,
      },
    });

    // 10.4 Update driver status
    await tx.driver.update({
      where: {
        id: dto.driverId,
      },
      data: {
        status: DriverStatus.ON_TRIP,
      },
    });

    // 10.5 Update booking status and create history
    for (const bookingId of bookingIds) {
      await tx.booking.update({
        where: {
          id: bookingId,
        },
        data: {
          status: BookingStatus.DISPATCHED,
        },
      });

      await tx.bookingStatusHistory.create({
        data: {
          bookingId,
          status: BookingStatus.DISPATCHED,
          changedBy: userId,
          remarks: `Assigned to trip ${tripNo}`,
        },
      });
    }

    // 10.6 Return created trip
    return trip;
  });
}


  async findAllTrips(companyId: string, query: any = {}) {
    const page = Math.max(Number(query.page ?? 1), 1);
    const limit = Math.min(Math.max(Number(query.limit ?? 20), 1), 100);
    const where: any = { companyId };

    if (query.status) where.status = query.status;
    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.driverId) where.driverId = query.driverId;

    const [data, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        include: {
          vehicle: true,
          driver: true,
          bookings: { include: { booking: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { data, pagination: { page, limit, total } };
  }

  async findTrip(companyId: string, id: string) {
    return this.getTrip(companyId, id);
  }

  async updateTrip(companyId: string, id: string, dto: any) {
    const trip = await this.getTrip(companyId, id);

    if (trip.status !== TripStatus.PLANNED) {
      throw new BadRequestException('Only planned trips can be edited');
    }

    return this.prisma.trip.update({
      where: { id },
      data: {
        ...dto,
        plannedStart: dto.plannedStart ? new Date(dto.plannedStart) : undefined,
        plannedEnd: dto.plannedEnd ? new Date(dto.plannedEnd) : undefined,
      },
    });
  }

  //   async startTrip(companyId: string, id: string) {
  //     const trip = await this.getTrip(companyId, id);

  //     if (trip.status !== TripStatus.PLANNED) {
  //       throw new BadRequestException('Only planned trips can be started');
  //     }

  //     return this.prisma.trip.update({
  //       where: { id },
  //       data: {
  //         status: TripStatus.STARTED,
  //         actualStart: new Date(),
  //       },
  //     });
  //   }

  async startTrip(companyId: string, id: string) {
    const trip = await this.getTrip(companyId, id);

    if (trip.status !== TripStatus.PLANNED) {
      throw new BadRequestException('Only planned trips can be started');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.STARTED,
          actualStart: new Date(),
        },
      });

      const assignments = await tx.tripBooking.findMany({
        where: { tripId: id },
      });

      for (const assignment of assignments) {
        await tx.booking.update({
          where: { id: assignment.bookingId },
          data: { status: BookingStatus.IN_TRANSIT },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: assignment.bookingId,
            status: BookingStatus.IN_TRANSIT,
            remarks: `Trip ${trip.tripNo} started`,
          },
        });
      }

      return updated;
    });
  }

  async completeTrip(companyId: string, id: string, dto: any) {
    const trip = await this.getTrip(companyId, id);

    if (
      trip.status !== TripStatus.STARTED &&
      trip.status !== TripStatus.IN_TRANSIT
    ) {
      throw new BadRequestException('Only started trips can be completed');
    }

    if (trip.startOdometer !== null && dto.endOdometer < trip.startOdometer) {
      throw new BadRequestException(
        'End odometer cannot be less than start odometer',
      );
    }

    const distance =
      trip.startOdometer !== null
        ? dto.endOdometer - trip.startOdometer
        : Number(trip.distanceKm ?? 0);

    return this.prisma.$transaction(async (tx: any) => {
      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: TripStatus.COMPLETED,
          actualEnd: new Date(),
          endOdometer: dto.endOdometer,
          distanceKm: distance,
        },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: VehicleStatus.AVAILABLE,
          currentOdometer: dto.endOdometer,
        },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.ACTIVE },
      });

    //   await tx.booking.updateMany({
    //     where: {
    //       companyId,
    //       tripBookings: { some: { tripId: id } },
    //       status: {
    //         in: [BookingStatus.DISPATCHED, BookingStatus.IN_TRANSIT],
    //       },
    //     },
    //     data: { status: BookingStatus.IN_TRANSIT },
    //   });

      return updated;
    });
  }

  async cancelTrip(companyId: string, userId: string, id: string) {
    const trip = await this.getTrip(companyId, id);

    if (
      trip.status === TripStatus.COMPLETED ||
      trip.status === TripStatus.CANCELLED
    ) {
      throw new BadRequestException('Trip cannot be cancelled');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id },
        data: { status: TripStatus.CANCELLED },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.ACTIVE },
      });

      const assignments = await tx.tripBooking.findMany({
        where: { tripId: id },
      });

      for (const assignment of assignments) {
        await tx.booking.update({
          where: { id: assignment.bookingId },
          data: { status: BookingStatus.CONFIRMED },
        });

        await tx.bookingStatusHistory.create({
          data: {
            bookingId: assignment.bookingId,
            status: BookingStatus.CONFIRMED,
            changedBy: userId,
            remarks: `Trip ${trip.tripNo} cancelled; booking returned to confirmed`,
          },
        });
      }

      return updated;
    });
  }

  // =======================================================
  // 18. TRIP EXPENSES
  // =======================================================

  async createTripExpense(companyId: string, tripId: string, dto: any) {
    const trip = await this.getTrip(companyId, tripId);

    if (
      trip.status === TripStatus.COMPLETED ||
      trip.status === TripStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot add expense to a completed or cancelled trip',
      );
    }

    if (dto.driverId) {
      const driver = await this.validateDriver(companyId, dto.driverId);
      if (driver.id !== trip.driverId) {
        throw new BadRequestException(
          'Expense driver must be the assigned trip driver',
        );
      }
    }

    const expense = await this.prisma.tripExpense.create({
      data: {
        tripId,
        driverId: dto.driverId,
        category: dto.category,
        amount: dto.amount,
        paymentMode: dto.paymentMode ?? 'CASH',
        expenseDate: dto.expenseDate ? new Date(dto.expenseDate) : new Date(),
        location: dto.location,
        description: dto.description,
        receiptUrl: dto.receiptUrl,
      },
    });

    await this.recalculateTrip(tripId);
    return expense;
  }

  async findTripExpenses(companyId: string, tripId: string) {
    await this.getTrip(companyId, tripId);

    return this.prisma.tripExpense.findMany({
      where: { tripId },
      include: { driver: true },
      orderBy: { expenseDate: 'desc' },
    });
  }

  async approveTripExpense(
    companyId: string,
    expenseId: string,
    userId: string,
  ) {
    const expense = await this.prisma.tripExpense.findFirst({
      where: { id: expenseId, trip: { companyId } },
    });

    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.isApproved) {
      throw new ConflictException('Expense is already approved');
    }

    return this.prisma.tripExpense.update({
      where: { id: expenseId },
      data: { isApproved: true, approvedBy: userId },
    });
  }

  // =======================================================
  // 19. FUEL ENTRIES
  // =======================================================

  async createFuelEntry(companyId: string, dto: any) {
    const vehicle = await this.validateVehicle(companyId, dto.vehicleId);

    if (dto.tripId) {
      const trip = await this.getTrip(companyId, dto.tripId);
      if (trip.vehicleId !== dto.vehicleId) {
        throw new BadRequestException(
          'Fuel vehicle does not match the trip vehicle',
        );
      }
      if (
        trip.status === TripStatus.COMPLETED ||
        trip.status === TripStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'Cannot add fuel to a completed or cancelled trip',
        );
      }
    }

    if (dto.odometer !== undefined && dto.odometer < vehicle.currentOdometer) {
      throw new BadRequestException(
        'Fuel odometer cannot be less than vehicle current odometer',
      );
    }

    const totalAmount = Number(
      (Number(dto.litres) * Number(dto.ratePerLitre)).toFixed(2),
    );

    const fuel = await this.prisma.$transaction(async (tx) => {
      const created = await tx.fuelEntry.create({
        data: {
          vehicleId: dto.vehicleId,
          tripId: dto.tripId,
          fuelDate: dto.fuelDate ? new Date(dto.fuelDate) : new Date(),
          litres: dto.litres,
          ratePerLitre: dto.ratePerLitre,
          totalAmount,
          odometer: dto.odometer,
          pumpName: dto.pumpName,
          isFullTank: dto.isFullTank ?? true,
          receiptUrl: dto.receiptUrl,
        },
      });

      if (
        dto.odometer !== undefined &&
        dto.odometer > vehicle.currentOdometer
      ) {
        await tx.vehicle.update({
          where: { id: vehicle.id },
          data: { currentOdometer: dto.odometer },
        });
      }

      return created;
    });

    if (dto.tripId) await this.recalculateTrip(dto.tripId);
    return fuel;
  }

  async findFuelEntries(companyId: string, query: any = {}) {
    const where: any = { vehicle: { companyId } };

    if (query.vehicleId) where.vehicleId = query.vehicleId;
    if (query.tripId) where.tripId = query.tripId;

    if (query.from || query.to) {
      where.fuelDate = {};
      if (query.from) where.fuelDate.gte = new Date(query.from);
      if (query.to) where.fuelDate.lte = new Date(query.to);
    }

    return this.prisma.fuelEntry.findMany({
      where,
      include: { vehicle: true, trip: true },
      orderBy: { fuelDate: 'desc' },
    });
  }

  async getFuelSummary(companyId: string, vehicleId: string) {
    await this.validateVehicle(companyId, vehicleId);

    const entries = await this.prisma.fuelEntry.findMany({
      where: { vehicleId },
      orderBy: { fuelDate: 'asc' },
    });

    const totalLitres = entries.reduce(
      (sum, entry) => sum + Number(entry.litres),
      0,
    );
    const totalAmount = entries.reduce(
      (sum, entry) => sum + Number(entry.totalAmount),
      0,
    );

    const fullTankEntries = entries.filter(
      (entry) => entry.isFullTank && entry.odometer !== null,
    );

    let measuredDistance = 0;
    let measuredLitres = 0;

    // Full-tank to full-tank method gives a more useful mileage estimate.
    for (let i = 1; i < fullTankEntries.length; i++) {
      const previous = fullTankEntries[i - 1];
      const current = fullTankEntries[i];

      if (current.odometer! > previous.odometer!) {
        measuredDistance += current.odometer! - previous.odometer!;
        measuredLitres += Number(current.litres);
      }
    }

    return {
      vehicleId,
      entriesCount: entries.length,
      totalLitres: Number(totalLitres.toFixed(2)),
      totalAmount: Number(totalAmount.toFixed(2)),
      averageRatePerLitre:
        totalLitres > 0 ? Number((totalAmount / totalLitres).toFixed(2)) : 0,
      measuredDistanceKm: measuredDistance,
      estimatedMileageKmPerLitre:
        measuredLitres > 0
          ? Number((measuredDistance / measuredLitres).toFixed(2))
          : null,
      note: 'Mileage is estimated using consecutive full-tank entries with odometer readings.',
    };
  }
}
