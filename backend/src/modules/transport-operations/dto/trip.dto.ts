
import {
  IsArray,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTripDto {
  @IsOptional()
  @IsString()
  branchId?: string;

  @IsString()
  vehicleId: string;

  @IsString()
  driverId: string;

  @IsOptional()
  @IsString()
  vendorId?: string;

  @IsString()
  originCity: string;

  @IsString()
  destCity: string;

  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  startOdometer?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  loadWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hireCharges?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  hireAdvancePaid?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  driverAdvance?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bookingIds?: string[];

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class UpdateTripDto {
  @IsOptional()
  @IsDateString()
  plannedStart?: string;

  @IsOptional()
  @IsDateString()
  plannedEnd?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  loadWeightKg?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CompleteTripDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  endOdometer: number;
}
