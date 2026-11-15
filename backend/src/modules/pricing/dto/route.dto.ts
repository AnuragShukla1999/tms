import { PartialType } from '@nestjs/mapped-types';
import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRouteDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsString()
  @MaxLength(100)
  originCity: string;

  @IsOptional()
  @IsString()
  originState?: string;

  @IsString()
  @MaxLength(100)
  destCity: string;

  @IsOptional()
  @IsString()
  destState?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  distanceKm?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  estimatedHours?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  tollEstimate?: number;
}

export class UpdateRouteDto extends PartialType(CreateRouteDto) {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}