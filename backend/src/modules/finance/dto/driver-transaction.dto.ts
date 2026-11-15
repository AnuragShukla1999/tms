import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  DriverTransactionType,
  PaymentMode,
} from '../../../generated/prisma/enums.js';

export class CreateDriverTransactionDto {
  @IsString()
  driverId: string;

  /** Trip the advance / allowance belongs to. Must be the driver's trip. */
  @IsOptional()
  @IsString()
  tripId?: string;

  @IsEnum(DriverTransactionType)
  type: DriverTransactionType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMode)
  paymentMode?: PaymentMode;

  @IsOptional()
  @IsDateString()
  date?: string;

  /** "YYYY-MM". Required for SALARY. */
  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'forMonth must be in YYYY-MM format',
  })
  forMonth?: string;

  @IsOptional()
  @IsString()
  remarks?: string;
}

export class QueryDriverTransactionDto {
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
  driverId?: string;

  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsEnum(DriverTransactionType)
  type?: DriverTransactionType;

  @IsOptional()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'forMonth must be in YYYY-MM format',
  })
  forMonth?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class DriverSalarySummaryQueryDto {
  @Matches(/^\d{4}-(0[1-9]|1[0-2])$/, {
    message: 'month must be in YYYY-MM format',
  })
  month: string;
}
