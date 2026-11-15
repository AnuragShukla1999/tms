import { PartialType } from '@nestjs/mapped-types';
import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

import {
  RateType,
  VehicleType,
} from '../../../generated/prisma/enums.js';

export class CreateRateCardDto {
  @IsOptional()
  @IsString()
  routeId?: string;

  // Null means default rate for all customers.
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsEnum(RateType)
  rateType: RateType;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  rate: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minCharge?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsOptional()
  @IsDateString()
  validTo?: string;
}

export class UpdateRateCardDto extends PartialType(CreateRateCardDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}