import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { randomUUID } from 'node:crypto';

// import { PrismaService } from '../../prisma/prisma.service.js';

import { CreateRouteDto, UpdateRouteDto } from './dto/route.dto.js';
import {
  CreateRateCardDto,
  UpdateRateCardDto,
} from './dto/rate-card.dto.js';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
} from './dto/quotation.dto.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class PricingService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // HELPERS
  // =====================================================

  private async getRoute(companyId: string, routeId: string) {
    const route = await this.prisma.route.findFirst({
      where: { id: routeId, companyId },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  private async getRateCard(companyId: string, rateCardId: string) {
    const card = await this.prisma.rateCard.findFirst({
      where: { id: rateCardId, companyId },
    });

    if (!card) {
      throw new NotFoundException('Rate card not found');
    }

    return card;
  }

  private async getCustomer(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: customerId,
        companyId,
        isActive: true,
      },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found or inactive');
    }

    return customer;
  }

  private async getQuotation(companyId: string, quotationId: string) {
    const quotation = await this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        customer: { companyId },
      },
      include: { customer: true },
    });

    if (!quotation) {
      throw new NotFoundException('Quotation not found');
    }

    return quotation;
  }

  private generateQuotationNo() {
    const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
    return `QT-${date}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  // =====================================================
  // 8. ROUTES
  // =====================================================

  async createRoute(companyId: string, dto: CreateRouteDto) {
    const originCity = dto.originCity.trim();
    const destCity = dto.destCity.trim();

    if (originCity.toLowerCase() === destCity.toLowerCase()) {
      throw new BadRequestException(
        'Origin and destination cannot be the same',
      );
    }

    return this.prisma.route.create({
      data: {
        ...dto,
        companyId,
        originCity,
        destCity,
      },
    });
  }

  async findAllRoutes(
    companyId: string,
    search?: string,
    page = 1,
    limit = 10,
  ) {
    const where: any = {
      companyId,
      ...(search
        ? {
            OR: [
              { originCity: { contains: search, mode: 'insensitive' } },
              { destCity: { contains: search, mode: 'insensitive' } },
              { name: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.route.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { rateCards: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.route.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findRoute(companyId: string, routeId: string) {
    await this.getRoute(companyId, routeId);

    return this.prisma.route.findFirst({
      where: { id: routeId, companyId },
      include: {
        rateCards: {
          where: { isActive: true },
          include: { customer: true },
        },
      },
    });
  }

  async updateRoute(
    companyId: string,
    routeId: string,
    dto: UpdateRouteDto,
  ) {
    await this.getRoute(companyId, routeId);

    if (
      dto.originCity &&
      dto.destCity &&
      dto.originCity.trim().toLowerCase() ===
        dto.destCity.trim().toLowerCase()
    ) {
      throw new BadRequestException(
        'Origin and destination cannot be the same',
      );
    }

    return this.prisma.route.update({
      where: { id: routeId },
      data: {
        ...dto,
        originCity: dto.originCity?.trim(),
        destCity: dto.destCity?.trim(),
      },
    });
  }

  async deactivateRoute(companyId: string, routeId: string) {
    await this.getRoute(companyId, routeId);

    return this.prisma.route.update({
      where: { id: routeId },
      data: { isActive: false },
    });
  }

  // =====================================================
  // 9. RATE CARDS
  // =====================================================

  async createRateCard(companyId: string, dto: CreateRateCardDto) {
    if (dto.routeId) {
      const route = await this.getRoute(companyId, dto.routeId);

      if (!route.isActive) {
        throw new BadRequestException('Cannot use an inactive route');
      }
    }

    if (dto.customerId) {
      await this.getCustomer(companyId, dto.customerId);
    }

    const validFrom = dto.validFrom
      ? new Date(dto.validFrom)
      : new Date();

    const validTo = dto.validTo ? new Date(dto.validTo) : null;

    if (validTo && validTo < validFrom) {
      throw new BadRequestException(
        'validTo cannot be earlier than validFrom',
      );
    }

    return this.prisma.rateCard.create({
      data: {
        companyId,
        routeId: dto.routeId,
        customerId: dto.customerId,
        vehicleType: dto.vehicleType,
        rateType: dto.rateType,
        rate: dto.rate,
        minCharge: dto.minCharge,
        validFrom,
        validTo,
      },
      include: {
        route: true,
        customer: true,
      },
    });
  }

  async findAllRateCards(
    companyId: string,
    customerId?: string,
    routeId?: string,
    activeOnly = true,
  ) {
    if (customerId) {
      await this.getCustomer(companyId, customerId);
    }

    if (routeId) {
      await this.getRoute(companyId, routeId);
    }

    return this.prisma.rateCard.findMany({
      where: {
        companyId,
        ...(activeOnly ? { isActive: true } : {}),
        ...(customerId
          ? {
              OR: [
                { customerId },
                { customerId: null },
              ],
            }
          : {}),
        ...(routeId ? { routeId } : {}),
      },
      include: {
        route: true,
        customer: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findRateCard(companyId: string, rateCardId: string) {
    await this.getRateCard(companyId, rateCardId);

    return this.prisma.rateCard.findFirst({
      where: { id: rateCardId, companyId },
      include: { route: true, customer: true },
    });
  }

  async updateRateCard(
    companyId: string,
    rateCardId: string,
    dto: UpdateRateCardDto,
  ) {
    await this.getRateCard(companyId, rateCardId);

    if (dto.routeId) {
      await this.getRoute(companyId, dto.routeId);
    }

    if (dto.customerId) {
      await this.getCustomer(companyId, dto.customerId);
    }

    const validFrom = dto.validFrom
      ? new Date(dto.validFrom)
      : undefined;
    const validTo = dto.validTo
      ? new Date(dto.validTo)
      : undefined;

    if (validFrom && validTo && validTo < validFrom) {
      throw new BadRequestException(
        'validTo cannot be earlier than validFrom',
      );
    }

    return this.prisma.rateCard.update({
      where: { id: rateCardId },
      data: {
        ...dto,
        validFrom,
        validTo,
      },
      include: { route: true, customer: true },
    });
  }

  async deactivateRateCard(companyId: string, rateCardId: string) {
    await this.getRateCard(companyId, rateCardId);

    return this.prisma.rateCard.update({
      where: { id: rateCardId },
      data: { isActive: false },
    });
  }

  // =====================================================
  // RATE LOOKUP
  // =====================================================

//   private async findApplicableRate(input: {
//     companyId: string;
//     routeId?: string;
//     customerId: string;
//     vehicleType?: any;
//     rateType: any;
//   }) {
//     const now = new Date();

//     const cards = await this.prisma.rateCard.findMany({
//       where: {
//         companyId: input.companyId,
//         isActive: true,
//         rateType: input.rateType,
//         OR: [
//           { customerId: input.customerId },
//           { customerId: null },
//         ],
//         ...(input.routeId
//           ? {
//               OR: [
//                 { routeId: input.routeId },
//                 { routeId: null },
//               ],
//             }
//           : { routeId: null }),
//         AND: [
//           { validFrom: { lte: now } },
//           {
//             OR: [
//               { validTo: null },
//               { validTo: { gte: now } },
//             ],
//           },
//           ...(input.vehicleType
//             ? [
//                 {
//                   OR: [
//                     { vehicleType: input.vehicleType },
//                     { vehicleType: null },
//                   ],
//                 },
//               ]
//             : [{ vehicleType: null }]),
//         ],
//       },
//       orderBy: [
//         { customerId: 'desc' },
//         { routeId: 'desc' },
//         { vehicleType: 'desc' },
//       ],
//     });

//     // Customer-specific + route-specific rates take precedence.
//     const sorted = cards.sort((a:any, b:any) => {
//       const score = (card: (typeof cards)[number]) =>
//         (card.customerId === input.customerId ? 4 : 0) +
//         (card.routeId === input.routeId && input.routeId ? 2 : 0) +
//         (card.vehicleType === input.vehicleType && input.vehicleType ? 1 : 0);

//       return score(b) - score(a);
//     });

//     return sorted[0] ?? null;
//   }



private async findApplicableRate(input: {
  companyId: string;
  routeId?: string;
  customerId: string;
  vehicleType?: any;
  rateType: any;
}) {
  const now = new Date();

  const cards = await this.prisma.rateCard.findMany({
    where: {
      companyId: input.companyId,
      isActive: true,
      rateType: input.rateType,
      AND: [
        {
          OR: [
            { customerId: input.customerId },
            { customerId: null },
          ],
        },
        {
          OR: input.routeId
            ? [
                { routeId: input.routeId },
                { routeId: null },
              ]
            : [{ routeId: null }],
        },
        {
          OR: input.vehicleType
            ? [
                { vehicleType: input.vehicleType },
                { vehicleType: null },
              ]
            : [{ vehicleType: null }],
        },
        { validFrom: { lte: now } },
        {
          OR: [
            { validTo: null },
            { validTo: { gte: now } },
          ],
        },
      ],
    },
  });

  const score = (card: (typeof cards)[number]) =>
    (card.customerId === input.customerId ? 4 : 0) +
    (card.routeId === input.routeId && input.routeId ? 2 : 0) +
    (card.vehicleType === input.vehicleType && input.vehicleType ? 1 : 0);

  cards.sort((a:any, b:any) => score(b) - score(a));

  return cards[0] ?? null;
}



  // =====================================================
  // 10. QUOTATIONS
  // =====================================================

  async createQuotation(
    companyId: string,
    dto: CreateQuotationDto,
  ) {
    await this.getCustomer(companyId, dto.customerId);

    if (dto.pickupCity.trim().toLowerCase() === dto.dropCity.trim().toLowerCase()) {
      throw new BadRequestException(
        'Pickup and drop cities cannot be the same',
      );
    }

    let route: any = null;

    if (dto.routeId) {
      route = await this.getRoute(companyId, dto.routeId);

      if (
        route.originCity.toLowerCase() !== dto.pickupCity.trim().toLowerCase() ||
        route.destCity.toLowerCase() !== dto.dropCity.trim().toLowerCase()
      ) {
        throw new BadRequestException(
          'Selected route does not match pickup and drop cities',
        );
      }
    } else {
      route = await this.prisma.route.findFirst({
        where: {
          companyId,
          isActive: true,
          originCity: { equals: dto.pickupCity.trim(), mode: 'insensitive' },
          destCity: { equals: dto.dropCity.trim(), mode: 'insensitive' },
        },
      });
    }

    const rateType = dto.rateType ?? 'PER_TRIP';
    const distanceKm = dto.distanceKm ?? Number(route?.distanceKm ?? 0);

    if (rateType === 'PER_KM' && distanceKm <= 0) {
      throw new BadRequestException(
        'Distance is required for PER_KM quotations',
      );
    }

    if (rateType === 'PER_TON' && !dto.weightTons) {
      throw new BadRequestException(
        'weightTons is required for PER_TON quotations',
      );
    }

    if (rateType === 'PER_KG' && !dto.weightTons) {
      throw new BadRequestException(
        'weightTons is required for PER_KG quotations',
      );
    }

    if (rateType === 'PER_PACKAGE' && !dto.packageCount) {
      throw new BadRequestException(
        'packageCount is required for PER_PACKAGE quotations',
      );
    }

    let rate = dto.manualRate;
    let minCharge = 0;

    if (rate === undefined) {
      const rateCard = await this.findApplicableRate({
        companyId,
        routeId: route?.id,
        customerId: dto.customerId,
        vehicleType: dto.vehicleType,
        rateType,
      });

      if (!rateCard) {
        throw new NotFoundException(
          'No applicable rate card found. Create a rate card or provide manualRate.',
        );
      }

      rate = Number(rateCard.rate);
      minCharge = Number(rateCard.minCharge ?? 0);
    }

    let quantity = 1;

    switch (rateType) {
      case 'PER_KM':
        quantity = distanceKm;
        break;
      case 'PER_TON':
        quantity = dto.weightTons!;
        break;
      case 'PER_KG':
        quantity = dto.weightTons! * 1000;
        break;
      case 'PER_PACKAGE':
        quantity = dto.packageCount!;
        break;
      case 'PER_TRIP':
      default:
        quantity = 1;
    }

    const freightAmount = Math.max(rate * quantity, minCharge);
    const otherCharges = dto.otherCharges ?? 0;
    const gstPercent = dto.gstPercent ?? 5;
    const taxableAmount = freightAmount + otherCharges;
    const gstAmount = Number(
      ((taxableAmount * gstPercent) / 100).toFixed(2),
    );
    const totalAmount = Number(
      (taxableAmount + gstAmount).toFixed(2),
    );

    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : null;

    if (validUntil && validUntil <= new Date()) {
      throw new BadRequestException(
        'Quotation validity must be in the future',
      );
    }

    return this.prisma.quotation.create({
      data: {
        quotationNo: this.generateQuotationNo(),
        customerId: dto.customerId,
        pickupCity: dto.pickupCity.trim(),
        dropCity: dto.dropCity.trim(),
        goodsDescription: dto.goodsDescription,
        weightTons: dto.weightTons,
        packageCount: dto.packageCount,
        vehicleType: dto.vehicleType,
        distanceKm,
        rateType,
        rate,
        freightAmount,
        otherCharges,
        gstPercent,
        gstAmount,
        totalAmount,
        validUntil,
        notes: dto.notes,
      },
      include: { customer: true },
    });
  }

  async findAllQuotations(
    companyId: string,
    status?: string,
    customerId?: string,
    page = 1,
    limit = 10,
  ) {
    if (customerId) {
      await this.getCustomer(companyId, customerId);
    }

    const where: any = {
      customer: { companyId },
      ...(status ? { status } : {}),
      ...(customerId ? { customerId } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.quotation.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quotation.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findQuotation(companyId: string, quotationId: string) {
    await this.getQuotation(companyId, quotationId);

    return this.prisma.quotation.findFirst({
      where: {
        id: quotationId,
        customer: { companyId },
      },
      include: { customer: true, bookings: true },
    });
  }

//   async updateQuotation(
//     companyId: string,
//     quotationId: string,
//     dto: UpdateQuotationDto,
//   ) {
//     const quotation = await this.getQuotation(companyId, quotationId);

//     if (quotation.status !== 'DRAFT') {
//       throw new BadRequestException(
//         'Only draft quotations can be edited',
//       );
//     }

//     if (dto.customerId) {
//       await this.getCustomer(companyId, dto.customerId);
//     }

//     // Recalculate by using the same pricing logic.
//     const recalculated = await this.createQuotation(
//       companyId,
//       {
//         customerId: dto.customerId ?? quotation.customerId,
//         pickupCity: dto.pickupCity ?? quotation.pickupCity,
//         dropCity: dto.dropCity ?? quotation.dropCity,
//         goodsDescription: dto.goodsDescription ?? quotation.goodsDescription ?? undefined,
//         // weightTons: dto.weightTons ?? Number(quotation.weightTons ?? 0) || undefined,
//         weightTons: dto.weightTons ?? (Number(quotation.weightTons ?? 0) || undefined),
//         packageCount: dto.packageCount ?? quotation.packageCount ?? undefined,
//         vehicleType: dto.vehicleType ?? quotation.vehicleType ?? undefined,
//         rateType: dto.rateType ?? quotation.rateType,
//         manualRate: dto.manualRate ?? Number(quotation.rate),
//         distanceKm: dto.distanceKm ?? Number(quotation.distanceKm ?? 0),
//         otherCharges: dto.otherCharges ?? Number(quotation.otherCharges),
//         gstPercent: dto.gstPercent ?? Number(quotation.gstPercent),
//         validUntil: dto.validUntil ?? quotation.validUntil?.toISOString(),
//         notes: dto.notes ?? quotation.notes ?? undefined,
//       },
//     );

//     // Keep the original quotation number and update the existing record.
//     await this.prisma.quotation.delete({
//       where: { id: recalculated.id },
//     });

//     return this.prisma.quotation.update({
//       where: { id: quotationId },
//       data: {
//         customerId: dto.customerId,
//         pickupCity: dto.pickupCity,
//         dropCity: dto.dropCity,
//         goodsDescription: dto.goodsDescription,
//         weightTons: dto.weightTons,
//         packageCount: dto.packageCount,
//         vehicleType: dto.vehicleType,
//         distanceKm: dto.distanceKm,
//         rateType: dto.rateType,
//         rate: recalculated.rate,
//         freightAmount: recalculated.freightAmount,
//         otherCharges: recalculated.otherCharges,
//         gstPercent: recalculated.gstPercent,
//         gstAmount: recalculated.gstAmount,
//         totalAmount: recalculated.totalAmount,
//         validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
//         notes: dto.notes,
//       },
//       include: { customer: true },
//     });
//   }




  async updateQuotation(
  companyId: string,
  quotationId: string,
  dto: UpdateQuotationDto,
) {
  const quotation = await this.getQuotation(companyId, quotationId);

  if (quotation.status !== 'DRAFT') {
    throw new BadRequestException(
      'Only draft quotations can be edited',
    );
  }

  const customerId = dto.customerId ?? quotation.customerId;
  await this.getCustomer(companyId, customerId);

  const pickupCity = dto.pickupCity ?? quotation.pickupCity;
  const dropCity = dto.dropCity ?? quotation.dropCity;
  const rateType = dto.rateType ?? quotation.rateType;
  const rate = dto.manualRate ?? Number(quotation.rate);
  const weightTons =
    dto.weightTons ?? Number(quotation.weightTons ?? 0);
  const packageCount =
    dto.packageCount ?? quotation.packageCount ?? 0;
  const distanceKm =
    dto.distanceKm ?? Number(quotation.distanceKm ?? 0);
  const otherCharges =
    dto.otherCharges ?? Number(quotation.otherCharges);
  const gstPercent =
    dto.gstPercent ?? Number(quotation.gstPercent);

  if (pickupCity.trim().toLowerCase() === dropCity.trim().toLowerCase()) {
    throw new BadRequestException(
      'Pickup and drop cities cannot be the same',
    );
  }

  let quantity = 1;

  switch (rateType) {
    case 'PER_KM':
      if (distanceKm <= 0) {
        throw new BadRequestException('Distance is required');
      }
      quantity = distanceKm;
      break;

    case 'PER_TON':
      if (weightTons <= 0) {
        throw new BadRequestException('Weight is required');
      }
      quantity = weightTons;
      break;

    case 'PER_KG':
      if (weightTons <= 0) {
        throw new BadRequestException('Weight is required');
      }
      quantity = weightTons * 1000;
      break;

    case 'PER_PACKAGE':
      if (packageCount <= 0) {
        throw new BadRequestException('Package count is required');
      }
      quantity = packageCount;
      break;

    case 'PER_TRIP':
      quantity = 1;
      break;
  }

  const freightAmount = rate * quantity;
  const taxableAmount = freightAmount + otherCharges;
  const gstAmount = Number(
    ((taxableAmount * gstPercent) / 100).toFixed(2),
  );
  const totalAmount = Number(
    (taxableAmount + gstAmount).toFixed(2),
  );

  const validUntil = dto.validUntil
    ? new Date(dto.validUntil)
    : undefined;

  if (validUntil && validUntil <= new Date()) {
    throw new BadRequestException(
      'Quotation validity must be in the future',
    );
  }

  return this.prisma.quotation.update({
    where: { id: quotationId },
    data: {
      customerId,
      pickupCity: pickupCity.trim(),
      dropCity: dropCity.trim(),
      goodsDescription:
        dto.goodsDescription ?? quotation.goodsDescription,
      weightTons,
      packageCount,
      vehicleType: dto.vehicleType ?? quotation.vehicleType,
      distanceKm,
      rateType,
      rate,
      freightAmount,
      otherCharges,
      gstPercent,
      gstAmount,
      totalAmount,
      validUntil,
      notes: dto.notes ?? quotation.notes,
    },
    include: { customer: true },
  });
}



  // Send means move DRAFT -> SENT.
  // Connect an email/WhatsApp provider separately to actually deliver it.
  async sendQuotation(companyId: string, quotationId: string) {
    const quotation = await this.getQuotation(companyId, quotationId);

    if (quotation.status !== 'DRAFT') {
      throw new BadRequestException(
        'Only draft quotations can be sent',
      );
    }

    if (quotation.validUntil && quotation.validUntil < new Date()) {
      throw new BadRequestException('Quotation has already expired');
    }

    return this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'SENT' },
      include: { customer: true },
    });
  }

  async acceptQuotation(companyId: string, quotationId: string) {
    const quotation = await this.getQuotation(companyId, quotationId);

    if (quotation.status !== 'SENT') {
      throw new BadRequestException(
        'Only sent quotations can be accepted',
      );
    }

    if (quotation.validUntil && quotation.validUntil < new Date()) {
      await this.prisma.quotation.update({
        where: { id: quotationId },
        data: { status: 'EXPIRED' },
      });

      throw new BadRequestException('Quotation has expired');
    }

    return this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'ACCEPTED' },
      include: { customer: true },
    });
  }

  async rejectQuotation(companyId: string, quotationId: string) {
    const quotation = await this.getQuotation(companyId, quotationId);

    if (quotation.status !== 'SENT') {
      throw new BadRequestException(
        'Only sent quotations can be rejected',
      );
    }

    return this.prisma.quotation.update({
      where: { id: quotationId },
      data: { status: 'REJECTED' },
      include: { customer: true },
    });
  }
}