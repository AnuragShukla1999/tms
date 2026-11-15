import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  PaymentMode,
  PaymentType,
} from '../../../generated/prisma/enums.js';

export class CreateCustomerPaymentDto {
  @IsString()
  customerId: string;

  /** Apply the payment against an invoice (must be issued and unpaid). */
  @IsOptional()
  @IsString()
  invoiceId?: string;

  /** Booking the payment relates to (e.g. an advance). */
  @IsOptional()
  @IsString()
  bookingId?: string;

  /** Defaults to FULL_PAYMENT with an invoice, ADVANCE without one. */
  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @IsEnum(PaymentMode)
  mode: PaymentMode;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class QueryCustomerPaymentDto {
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
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsString()
  invoiceId?: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  mode?: PaymentMode;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class CreateVendorPaymentDto {
  @IsString()
  vendorId: string;

  /** Trip being paid for (the trip's vendor must match). */
  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsEnum(PaymentType)
  type?: PaymentType;

  @IsEnum(PaymentMode)
  mode: PaymentMode;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  paymentDate?: string;

  @IsOptional()
  @IsString()
  referenceNo?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class QueryVendorPaymentDto {
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
  @IsString()
  vendorId?: string;

  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  mode?: PaymentMode;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
