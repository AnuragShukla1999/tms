import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsDateString,
  IsNumber,
  IsInt,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  DriverStatus,
  DocumentType,
  MaintenanceType,
} from '../../../generated/prisma/enums.js';

// ================= DRIVER =================

export class CreateDriverDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsString()
  licenseNo: string;

  @IsOptional() @IsString()
  userId?: string;

  @IsOptional() @IsString()
  alternatePhone?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  address?: string;

  @IsOptional() @IsString()
  city?: string;

  @IsOptional() @IsString()
  state?: string;

  @IsOptional() @IsDateString()
  dateOfBirth?: string;

  @IsOptional() @IsString()
  licenseType?: string;

  @IsOptional() @IsDateString()
  licenseExpiry?: string;

  @IsOptional() @IsString()
  aadhaarNo?: string;

  @IsOptional() @IsString()
  photoUrl?: string;

  @IsOptional() @IsDateString()
  joiningDate?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  monthlySalary?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  perKmRate?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  perTripAllowance?: number;

  @IsOptional() @IsString()
  bankName?: string;

  @IsOptional() @IsString()
  bankAccountNo?: string;

  @IsOptional() @IsString()
  ifscCode?: string;

  @IsOptional() @IsString()
  emergencyContactName?: string;

  @IsOptional() @IsString()
  emergencyContactPhone?: string;

  @IsOptional() @IsEnum(DriverStatus)
  status?: DriverStatus;
}

export class UpdateDriverDto extends PartialType(CreateDriverDto) {
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

// ================= DRIVER DOCUMENT =================

export class CreateDriverDocumentDto {
  @IsString()
  title: string;

  @IsOptional() @IsString()
  documentNo?: string;

  @IsOptional() @IsDateString()
  expiryDate?: string;

  @IsOptional() @IsString()
  fileUrl?: string;
}

export class UpdateDriverDocumentDto extends PartialType(
  CreateDriverDocumentDto,
) {}

// ================= VEHICLE DOCUMENT =================

export class CreateVehicleDocumentDto {
  @IsEnum(DocumentType)
  type: DocumentType;

  @IsOptional() @IsString()
  documentNo?: string;

  @IsOptional() @IsDateString()
  issueDate?: string;

  @IsOptional() @IsDateString()
  expiryDate?: string;

  @IsOptional() @IsString()
  fileUrl?: string;

  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateVehicleDocumentDto extends PartialType(
  CreateVehicleDocumentDto,
) {}

// ================= DRIVER-VEHICLE ASSIGNMENT =================

export class CreateAssignmentDto {
  @IsString()
  driverId: string;

  @IsString()
  vehicleId: string;
}

// ================= VEHICLE MAINTENANCE =================

export class CreateMaintenanceDto {
  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsDateString()
  serviceDate: string;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  odometer?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  cost?: number;

  @IsOptional() @IsString()
  garageName?: string;

  @IsOptional() @IsString()
  invoiceUrl?: string;

  @IsOptional() @IsDateString()
  nextServiceDate?: string;

  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  nextServiceOdometer?: number;
}

export class UpdateMaintenanceDto extends PartialType(
  CreateMaintenanceDto,
) {}

// ================= TYRE =================

export class CreateTyreDto {
  @IsString()
  serialNo: string;

  @IsOptional() @IsString()
  brand?: string;

  @IsOptional() @IsString()
  size?: string;

  @IsOptional() @IsDateString()
  purchaseDate?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  purchaseCost?: number;

  @IsOptional() @IsBoolean()
  isRetreaded?: boolean;
}

export class UpdateTyreDto extends PartialType(CreateTyreDto) {
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class FitTyreDto {
  @IsString()
  vehicleId: string;

  @IsString()
  position: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  fittedAtKm: number;
}

export class RemoveTyreDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  removedAtKm: number;
}