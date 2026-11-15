
import {
  IsBoolean,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateFuelEntryDto {
  @IsString()
  vehicleId: string;

  @IsOptional()
  @IsString()
  tripId?: string;

  @IsOptional()
  @IsDateString()
  fuelDate?: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  litres: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  ratePerLitre: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  odometer?: number;

  @IsOptional()
  @IsString()
  pumpName?: string;

  @IsOptional()
  @IsBoolean()
  isFullTank?: boolean;

  @IsOptional()
  @IsString()
  receiptUrl?: string;
}
