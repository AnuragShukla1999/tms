import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';

import {
  VehicleType,
  VehicleOwnership,
  VehicleStatus,
} from '../../../generated/prisma/enums.js';

export class CreateVehicleDto {
  @IsString()
  @IsNotEmpty()
  registrationNo: string;

  @IsEnum(VehicleType)
  type: VehicleType;

  @IsOptional()
  @IsString()
  make?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1900)
  @Max(2100)
  manufactureYear?: number;

  @IsOptional()
  @IsString()
  chassisNo?: string;

  @IsOptional()
  @IsString()
  engineNo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityTons?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacityCuft?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lengthFt?: number;

  @IsOptional()
  @IsString()
  fuelType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tankCapacityL?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  expectedMileage?: number;

  @IsOptional()
  @IsEnum(VehicleOwnership)
  ownership?: VehicleOwnership;

  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  currentOdometer?: number;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  gpsDeviceId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}