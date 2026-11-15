
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import {
  BookingStatus,
  PaymentTerms,
  VehicleType,
} from '../../../generated/prisma/enums.js';

export class BookingItemDto {
  @IsString()
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  volumeCuft?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  value?: number;
}

export class CreateBookingDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsString()
  branchId?: string;

  @IsOptional()
  @IsString()
  quotationId?: string;

  @IsOptional()
  @IsString()
  routeId?: string;

  @IsOptional()
  @IsDateString()
  pickupDate?: string;

  @IsOptional()
  @IsDateString()
  expectedDeliveryDate?: string;

  @IsString()
  pickupAddress: string;

  @IsString()
  pickupCity: string;

  @IsOptional()
  @IsString()
  pickupState?: string;

  @IsOptional()
  @IsString()
  pickupPincode?: string;

  @IsOptional()
  @IsString()
  pickupContactName?: string;

  @IsOptional()
  @IsString()
  pickupContactPhone?: string;

  @IsString()
  dropAddress: string;

  @IsString()
  dropCity: string;

  @IsOptional()
  @IsString()
  dropState?: string;

  @IsOptional()
  @IsString()
  dropPincode?: string;

  @IsOptional()
  @IsString()
  dropContactName?: string;

  @IsOptional()
  @IsString()
  dropContactPhone?: string;

  @IsOptional()
  @IsString()
  consignorName?: string;

  @IsOptional()
  @IsString()
  consignorGstin?: string;

  @IsOptional()
  @IsString()
  consigneeName?: string;

  @IsOptional()
  @IsString()
  consigneeGstin?: string;

  @IsOptional()
  @IsString()
  goodsType?: string;

  @IsOptional()
  @IsString()
  goodsDescription?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  requiredVehicleType?: VehicleType;

  @IsOptional()
  @IsEnum(PaymentTerms)
  paymentTerms?: PaymentTerms;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freightAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  loadingCharges?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  unloadingCharges?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  detentionCharges?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  otherCharges?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  gstPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  advanceReceived?: number;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingItemDto)
  items?: BookingItemDto[];
}

export class UpdateBookingDto extends PartialType(CreateBookingDto) {}

export class ChangeBookingStatusDto {
  @IsEnum(BookingStatus)
  status: BookingStatus;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsString()
  cancelReason?: string;
}
