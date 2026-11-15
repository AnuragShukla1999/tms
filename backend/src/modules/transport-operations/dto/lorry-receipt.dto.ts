
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentTerms } from '../../../generated/prisma/enums.js';

export class CreateLorryReceiptDto {
  @IsString()
  bookingId: string;

  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsDateString()
  lrDate?: string;

  @IsString()
  consignorName: string;

  @IsOptional()
  @IsString()
  consignorAddress?: string;

  @IsOptional()
  @IsString()
  consignorGstin?: string;

  @IsString()
  consigneeName: string;

  @IsOptional()
  @IsString()
  consigneeAddress?: string;

  @IsOptional()
  @IsString()
  consigneeGstin?: string;

  @IsString()
  fromCity: string;

  @IsString()
  toCity: string;

  @IsString()
  goodsDescription: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  packages?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  actualWeightKg?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  chargedWeightKg?: number;

  @IsOptional()
  @IsString()
  invoiceNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  goodsValue?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  freight?: number;

  @IsEnum(PaymentTerms)
  paymentTerms: PaymentTerms;

  @IsOptional()
  @IsString()
  pdfUrl?: string;
}
