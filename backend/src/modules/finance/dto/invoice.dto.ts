import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { InvoiceStatus } from '../../../generated/prisma/enums.js';

export class InvoiceItemDto {
  /** Optional link to the booking this line bills. */
  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsString()
  sacCode?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity?: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rate: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  gstPercent?: number;
}

export class UpdateInvoiceItemDto extends PartialType(InvoiceItemDto) {}

export class CreateInvoiceDto {
  @IsString()
  customerId: string;

  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  /** Defaults to invoiceDate + customer.creditDays. */
  @IsOptional()
  @IsDateString()
  dueDate?: string;

  /** State name. Defaults to the customer's state. Drives CGST/SGST vs IGST. */
  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;

  /**
   * Bookings to bill. One line is generated per non-zero charge
   * (freight, loading, unloading, detention, other) using the GST % on the booking.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bookingIds?: string[];

  /** Extra / manual lines (additional charges, adjustments...). */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InvoiceItemDto)
  items?: InvoiceItemDto[];

  /** true => issue immediately (posts to the customer ledger). */
  @IsOptional()
  @IsBoolean()
  issue?: boolean;
}

export class UpdateInvoiceDto {
  @IsOptional()
  @IsDateString()
  invoiceDate?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  placeOfSupply?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discount?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}

export class CancelInvoiceDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class QueryInvoiceDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @IsOptional()
  @IsEnum(InvoiceStatus)
  status?: InvoiceStatus;

  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}


export class AddInvoiceBookingsDto {
  @IsArray()
  @IsString({ each: true })
  bookingIds: string[];
}
