
import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EwayBillStatus } from '../../../generated/prisma/enums.js';

export class CreateEwayBillDto {
  @IsString()
  lorryReceiptId: string;

  @IsString()
  ewayBillNo: string;

  @IsDateString()
  generatedAt: string;

  @IsDateString()
  validUntil: string;

  @IsOptional()
  @IsEnum(EwayBillStatus)
  status?: EwayBillStatus;

  @IsOptional()
  @IsString()
  fromPincode?: string;

  @IsOptional()
  @IsString()
  toPincode?: string;

  @IsOptional()
  @IsString()
  vehicleNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @IsString()
  invoiceNo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  invoiceValue?: number;

  @IsOptional()
  @IsString()
  hsnCode?: string;

  @IsOptional()
  @IsString()
  pdfUrl?: string;
}
