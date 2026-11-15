import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';

import { PrismaService } from '../../database/prisma.service.js';

import { CreateVehicleDto } from './dto/create-vehicle.dto.js';
import { UpdateVehicleDto } from './dto/update-vehicle.dto.js';

import {
  VehicleOwnership,
  VehicleStatus,
} from '../../generated/prisma/enums.js';

@Injectable()
export class VehiclesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Validate attached vehicle vendor
  private async validateVendor(
    companyId: string,
    vendorId: string,
  ) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId,
        isActive: true,
      },
    });

    if (!vendor) {
      throw new BadRequestException(
        'Invalid vendor or vendor does not belong to this company',
      );
    }
  }

  // CREATE VEHICLE
  async create(
    companyId: string,
    dto: CreateVehicleDto,
  ) {
    const ownership = dto.ownership ?? VehicleOwnership.OWN;

    if (
      ownership === VehicleOwnership.ATTACHED &&
      !dto.vendorId
    ) {
      throw new BadRequestException(
        'Vendor ID is required for attached vehicles',
      );
    }

    if (
      ownership === VehicleOwnership.OWN &&
      dto.vendorId
    ) {
      throw new BadRequestException(
        'Vendor ID is not allowed for company-owned vehicles',
      );
    }

    if (dto.vendorId) {
      await this.validateVendor(companyId, dto.vendorId);
    }

    try {
      const vehicle = await this.prisma.vehicle.create({
        data: {
          companyId,

          registrationNo: dto.registrationNo.trim().toUpperCase(),
          type: dto.type,

          make: dto.make,
          model: dto.model,
          manufactureYear: dto.manufactureYear,
          chassisNo: dto.chassisNo,
          engineNo: dto.engineNo,

          capacityTons: dto.capacityTons,
          capacityCuft: dto.capacityCuft,
          lengthFt: dto.lengthFt,

          fuelType: dto.fuelType,
          tankCapacityL: dto.tankCapacityL,
          expectedMileage: dto.expectedMileage,

          ownership,
          vendorId: dto.vendorId,

          status: dto.status ?? VehicleStatus.AVAILABLE,

          currentOdometer: dto.currentOdometer ?? 0,
          gpsDeviceId: dto.gpsDeviceId,

          isActive: dto.isActive ?? true,
        },

        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      return {
        message: 'Vehicle created successfully',
        data: vehicle,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Vehicle registration number or GPS device ID already exists',
        );
      }

      throw error;
    }
  }

  // GET ALL VEHICLES
  async findAll(companyId: string) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: {
        companyId,
      },

      orderBy: {
        createdAt: 'desc',
      },

      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            phone: true,
          },
        },

        _count: {
          select: {
            documents: true,
            maintenances: true,
            trips: true,
          },
        },
      },
    });

    return {
      message: 'Vehicles fetched successfully',
      total: vehicles.length,
      data: vehicles,
    };
  }

  // GET VEHICLE BY ID
  async findOne(
    companyId: string,
    id: string,
  ) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        companyId,
      },

      include: {
        vendor: true,

        documents: {
          orderBy: {
            createdAt: 'desc',
          },
        },

        maintenances: {
          orderBy: {
            serviceDate: 'desc',
          },
        },

        driverAssignments: {
          include: {
            driver: {
              select: {
                id: true,
                name: true,
                phone: true,
                licenseNo: true,
              },
            },
          },
        },

        _count: {
          select: {
            trips: true,
            fuelEntries: true,
          },
        },
      },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return {
      message: 'Vehicle fetched successfully',
      data: vehicle,
    };
  }

  // UPDATE VEHICLE
  async update(
    companyId: string,
    id: string,
    dto: UpdateVehicleDto,
  ) {
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingVehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    const ownership = dto.ownership ?? existingVehicle.ownership;

    const vendorId =
      dto.ownership === VehicleOwnership.OWN
        ? null
        : dto.vendorId ?? existingVehicle.vendorId;

    if (
      ownership === VehicleOwnership.ATTACHED &&
      !vendorId
    ) {
      throw new BadRequestException(
        'Vendor ID is required for attached vehicles',
      );
    }

    if (ownership === VehicleOwnership.OWN && vendorId) {
      throw new BadRequestException(
        'Company-owned vehicles cannot have a vendor',
      );
    }

    if (vendorId) {
      await this.validateVendor(companyId, vendorId);
    }

    try {
      const vehicle = await this.prisma.vehicle.update({
        where: {
          id,
        },

        data: {
          ...dto,

          registrationNo:
            dto.registrationNo === undefined
              ? undefined
              : dto.registrationNo.trim().toUpperCase(),

          ownership,
          vendorId,
        },

        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
        },
      });

      return {
        message: 'Vehicle updated successfully',
        data: vehicle,
      };
    } catch (error: any) {
      if (error?.code === 'P2002') {
        throw new ConflictException(
          'Vehicle registration number or GPS device ID already exists',
        );
      }

      throw error;
    }
  }

  // DELETE VEHICLE (SOFT DELETE)
  async remove(
    companyId: string,
    id: string,
  ) {
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: {
        id,
        companyId,
      },
    });

    if (!existingVehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (!existingVehicle.isActive) {
      throw new ConflictException(
        'Vehicle is already deactivated',
      );
    }

    if (
      existingVehicle.status === VehicleStatus.ON_TRIP
    ) {
      throw new BadRequestException(
        'Cannot deactivate a vehicle currently on a trip',
      );
    }

    const vehicle = await this.prisma.vehicle.update({
      where: {
        id,
      },

      data: {
        isActive: false,
        status: VehicleStatus.INACTIVE,
      },
    });

    return {
      message: 'Vehicle deactivated successfully',
      data: {
        id: vehicle.id,
        registrationNo: vehicle.registrationNo,
        isActive: vehicle.isActive,
        status: vehicle.status,
      },
    };
  }
}