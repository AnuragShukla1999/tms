import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

// import { PrismaService } from '../../prisma/prisma.service.js';

import {
  CreateDriverDto,
  UpdateDriverDto,
  CreateDriverDocumentDto,
  UpdateDriverDocumentDto,
  CreateVehicleDocumentDto,
  UpdateVehicleDocumentDto,
  CreateAssignmentDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  CreateTyreDto,
  UpdateTyreDto,
  FitTyreDto,
  RemoveTyreDto,
} from './dto/fleet.dto.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class FleetOperationsService {
  constructor(private readonly prisma: PrismaService) {}

  // =====================================================
  // HELPERS
  // =====================================================

  private async getDriver(companyId: string, driverId: string) {
    const driver = await this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  private async getVehicle(companyId: string, vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: vehicleId, companyId },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  private async getDriverDocument(companyId: string, documentId: string) {
    const document = await this.prisma.driverDocument.findFirst({
      where: {
        id: documentId,
        driver: { companyId },
      },
    });

    if (!document) {
      throw new NotFoundException('Driver document not found');
    }

    return document;
  }

  private async getVehicleDocument(companyId: string, documentId: string) {
    const document = await this.prisma.vehicleDocument.findFirst({
      where: {
        id: documentId,
        vehicle: { companyId },
      },
    });

    if (!document) {
      throw new NotFoundException('Vehicle document not found');
    }

    return document;
  }

  private async getMaintenance(companyId: string, maintenanceId: string) {
    const maintenance = await this.prisma.vehicleMaintenance.findFirst({
      where: {
        id: maintenanceId,
        vehicle: { companyId },
      },
    });

    if (!maintenance) {
      throw new NotFoundException('Maintenance record not found');
    }

    return maintenance;
  }

  private async getTyre(companyId: string, tyreId: string) {
    const tyre = await this.prisma.tyre.findFirst({
      where: {
        id: tyreId,
         companyId,
      },
    });

    if (!tyre) {
      throw new NotFoundException('Tyre not found');
    }

    return tyre;
  }

  // =====================================================
  // 1. DRIVERS
  // =====================================================

  async createDriver(companyId: string, dto: CreateDriverDto) {
    return this.prisma.driver.create({
      data: {
        ...dto,
        companyId,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        joiningDate: dto.joiningDate ? new Date(dto.joiningDate) : undefined,
        licenseExpiry: dto.licenseExpiry
          ? new Date(dto.licenseExpiry)
          : undefined,
      },
    });
  }

  async findAllDrivers(
    companyId: string,
    page = 1,
    limit = 10,
    search?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = {
      companyId,
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
              { licenseNo: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.driver.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          documents: true,
          assignments: {
            where: { isActive: true },
            include: { vehicle: true },
          },
        },
      }),
      this.prisma.driver.count({ where }),
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

  async findDriver(companyId: string, driverId: string) {
    await this.getDriver(companyId, driverId);

    return this.prisma.driver.findFirst({
      where: { id: driverId, companyId },
      include: {
        documents: true,
        transactions: {
          orderBy: { date: 'desc' },
          take: 20,
        },
        assignments: {
          include: { vehicle: true },
          orderBy: { assignedAt: 'desc' },
        },
        trips: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });
  }

  async updateDriver(
    companyId: string,
    driverId: string,
    dto: UpdateDriverDto,
  ) {
    await this.getDriver(companyId, driverId);

    const data: any = { ...dto };

    if (dto.dateOfBirth) data.dateOfBirth = new Date(dto.dateOfBirth);
    if (dto.joiningDate) data.joiningDate = new Date(dto.joiningDate);
    if (dto.licenseExpiry) data.licenseExpiry = new Date(dto.licenseExpiry);

    return this.prisma.driver.update({
      where: { id: driverId },
      data,
    });
  }

  async deactivateDriver(companyId: string, driverId: string) {
    await this.getDriver(companyId, driverId);

    const activeAssignment =
      await this.prisma.driverVehicleAssignment.findFirst({
        where: { driverId, isActive: true },
      });

    if (activeAssignment) {
      throw new BadRequestException(
        'Release the driver from the vehicle before deactivating',
      );
    }

    return this.prisma.driver.update({
      where: { id: driverId },
      data: {
        isActive: false,
        status: 'INACTIVE',
      },
    });
  }

  // =====================================================
  // 2. DRIVER DOCUMENTS
  // =====================================================

  async createDriverDocument(
    companyId: string,
    driverId: string,
    dto: CreateDriverDocumentDto,
  ) {
    await this.getDriver(companyId, driverId);

    return this.prisma.driverDocument.create({
      data: {
        ...dto,
        driverId,
        expiryDate: dto.expiryDate
          ? new Date(dto.expiryDate)
          : undefined,
      },
    });
  }

  async findDriverDocuments(companyId: string, driverId: string) {
    await this.getDriver(companyId, driverId);

    return this.prisma.driverDocument.findMany({
      where: { driverId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateDriverDocument(
    companyId: string,
    documentId: string,
    dto: UpdateDriverDocumentDto,
  ) {
    await this.getDriverDocument(companyId, documentId);

    return this.prisma.driverDocument.update({
      where: { id: documentId },
      data: {
        ...dto,
        expiryDate: dto.expiryDate
          ? new Date(dto.expiryDate)
          : undefined,
      },
    });
  }

  async deleteDriverDocument(companyId: string, documentId: string) {
    await this.getDriverDocument(companyId, documentId);

    return this.prisma.driverDocument.delete({
      where: { id: documentId },
    });
  }

  // =====================================================
  // 3. VEHICLE DOCUMENTS
  // =====================================================

  async createVehicleDocument(
    companyId: string,
    vehicleId: string,
    dto: CreateVehicleDocumentDto,
  ) {
    await this.getVehicle(companyId, vehicleId);

    return this.prisma.vehicleDocument.create({
      data: {
        ...dto,
        vehicleId,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  async findVehicleDocuments(companyId: string, vehicleId: string) {
    await this.getVehicle(companyId, vehicleId);

    return this.prisma.vehicleDocument.findMany({
      where: { vehicleId },
      orderBy: { expiryDate: 'asc' },
    });
  }

  async updateVehicleDocument(
    companyId: string,
    documentId: string,
    dto: UpdateVehicleDocumentDto,
  ) {
    await this.getVehicleDocument(companyId, documentId);

    return this.prisma.vehicleDocument.update({
      where: { id: documentId },
      data: {
        ...dto,
        issueDate: dto.issueDate ? new Date(dto.issueDate) : undefined,
        expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      },
    });
  }

  async deleteVehicleDocument(companyId: string, documentId: string) {
    await this.getVehicleDocument(companyId, documentId);

    return this.prisma.vehicleDocument.delete({
      where: { id: documentId },
    });
  }

  // =====================================================
  // 4. DRIVER-VEHICLE ASSIGNMENT
  // =====================================================

  async assignDriver(companyId: string, dto: CreateAssignmentDto) {
    const [driver, vehicle] = await Promise.all([
      this.getDriver(companyId, dto.driverId),
      this.getVehicle(companyId, dto.vehicleId),
    ]);

    if (!driver.isActive || driver.status === 'INACTIVE') {
      throw new BadRequestException('Driver is inactive');
    }

    if (!vehicle.isActive || vehicle.status === 'INACTIVE') {
      throw new BadRequestException('Vehicle is inactive');
    }

    const [driverAssignment, vehicleAssignment] = await Promise.all([
      this.prisma.driverVehicleAssignment.findFirst({
        where: { driverId: dto.driverId, isActive: true },
      }),
      this.prisma.driverVehicleAssignment.findFirst({
        where: { vehicleId: dto.vehicleId, isActive: true },
      }),
    ]);

    if (driverAssignment) {
      throw new ConflictException(
        'Driver is already assigned to an active vehicle',
      );
    }

    if (vehicleAssignment) {
      throw new ConflictException(
        'Vehicle already has an active driver assignment',
      );
    }

    return this.prisma.driverVehicleAssignment.create({
      data: {
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
      },
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  async findAssignments(companyId: string, activeOnly = true) {
    return this.prisma.driverVehicleAssignment.findMany({
      where: {
        ...(activeOnly ? { isActive: true } : {}),
        driver: { companyId },
        vehicle: { companyId },
      },
      include: {
        driver: true,
        vehicle: true,
      },
      orderBy: { assignedAt: 'desc' },
    });
  }

  async releaseDriver(companyId: string, assignmentId: string) {
    const assignment =
      await this.prisma.driverVehicleAssignment.findFirst({
        where: {
          id: assignmentId,
          isActive: true,
          driver: { companyId },
          vehicle: { companyId },
        },
      });

    if (!assignment) {
      throw new NotFoundException('Active assignment not found');
    }

    return this.prisma.driverVehicleAssignment.update({
      where: { id: assignmentId },
      data: {
        isActive: false,
        releasedAt: new Date(),
      },
      include: {
        driver: true,
        vehicle: true,
      },
    });
  }

  // =====================================================
  // 5. VEHICLE MAINTENANCE
  // =====================================================

  async createMaintenance(
    companyId: string,
    vehicleId: string,
    dto: CreateMaintenanceDto,
  ) {
    const vehicle = await this.getVehicle(companyId, vehicleId);

    const record = await this.prisma.vehicleMaintenance.create({
      data: {
        ...dto,
        vehicleId,
        serviceDate: new Date(dto.serviceDate),
        nextServiceDate: dto.nextServiceDate
          ? new Date(dto.nextServiceDate)
          : undefined,
      },
    });

    if (dto.odometer && dto.odometer > vehicle.currentOdometer) {
      await this.prisma.vehicle.update({
        where: { id: vehicleId },
        data: { currentOdometer: dto.odometer },
      });
    }

    return record;
  }

  async findMaintenance(companyId: string, vehicleId: string) {
    await this.getVehicle(companyId, vehicleId);

    return this.prisma.vehicleMaintenance.findMany({
      where: { vehicleId },
      orderBy: { serviceDate: 'desc' },
    });
  }

  async findMaintenanceById(companyId: string, maintenanceId: string) {
    await this.getMaintenance(companyId, maintenanceId);

    return this.prisma.vehicleMaintenance.findUnique({
      where: { id: maintenanceId },
      include: { vehicle: true },
    });
  }

  async updateMaintenance(
    companyId: string,
    maintenanceId: string,
    dto: UpdateMaintenanceDto,
  ) {
    await this.getMaintenance(companyId, maintenanceId);

    return this.prisma.vehicleMaintenance.update({
      where: { id: maintenanceId },
      data: {
        ...dto,
        serviceDate: dto.serviceDate
          ? new Date(dto.serviceDate)
          : undefined,
        nextServiceDate: dto.nextServiceDate
          ? new Date(dto.nextServiceDate)
          : undefined,
      },
    });
  }

  async deleteMaintenance(companyId: string, maintenanceId: string) {
    await this.getMaintenance(companyId, maintenanceId);

    return this.prisma.vehicleMaintenance.delete({
      where: { id: maintenanceId },
    });
  }

  // =====================================================
  // 6. TYRES
  // =====================================================

  async createTyre(companyId: string, dto: CreateTyreDto) {
    return this.prisma.tyre.create({
      data: {
        ...dto,
        companyId,
        purchaseDate: dto.purchaseDate
          ? new Date(dto.purchaseDate)
          : undefined,
      },
    });
  }

  async findTyres(companyId: string, vehicleId?: string) {
    if (vehicleId) {
      await this.getVehicle(companyId, vehicleId);
    }

    return this.prisma.tyre.findMany({
      where: {
        companyId,
        isActive: true,
        ...(vehicleId
          ? { vehicleId }
          : {}),
      },
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateTyre(
    companyId: string,
    tyreId: string,
    dto: UpdateTyreDto,
  ) {
    await this.getTyre(companyId, tyreId);

    return this.prisma.tyre.update({
      where: { id: tyreId },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate
          ? new Date(dto.purchaseDate)
          : undefined,
      },
    });
  }

  async fitTyre(companyId: string, tyreId: string, dto: FitTyreDto) {
    await this.getVehicle(companyId, dto.vehicleId);

    const tyre = await this.getTyre(companyId, tyreId);

    if (!tyre.isActive) {
      throw new BadRequestException('Inactive tyre cannot be fitted');
    }

    if (tyre.vehicleId) {
      throw new ConflictException('Tyre is already fitted to a vehicle');
    }

    const positionOccupied = await this.prisma.tyre.findFirst({
      where: {
        vehicleId: dto.vehicleId,
        position: dto.position,
        isActive: true,
      },
    });

    if (positionOccupied) {
      throw new ConflictException(
        `Position ${dto.position} is already occupied`,
      );
    }

    return this.prisma.tyre.update({
      where: { id: tyreId },
      data: {
        vehicleId: dto.vehicleId,
        position: dto.position,
        fittedAtKm: dto.fittedAtKm,
        removedAtKm: null,
      },
      include: { vehicle: true },
    });
  }

  async removeTyre(
    companyId: string,
    tyreId: string,
    dto: RemoveTyreDto,
  ) {
    const tyre = await this.getTyre(companyId, tyreId);

    if (!tyre.vehicleId) {
      throw new BadRequestException('Tyre is not currently fitted');
    }

    return this.prisma.tyre.update({
      where: { id: tyreId },
      data: {
        vehicleId: null,
        position: null,
        removedAtKm: dto.removedAtKm,
      },
    });
  }

  async deactivateTyre(companyId: string, tyreId: string) {
    const tyre = await this.getTyre(companyId, tyreId);

    if (tyre.vehicleId) {
      throw new BadRequestException(
        'Remove the tyre from its vehicle before deactivating it',
      );
    }

    return this.prisma.tyre.update({
      where: { id: tyreId },
      data: { isActive: false },
    });
  }
}