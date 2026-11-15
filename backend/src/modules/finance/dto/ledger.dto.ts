import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  LedgerEntryType,
  LedgerPartyType,
} from '../../../generated/prisma/enums.js';

export class LedgerStatementQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}

export class LedgerSummaryQueryDto {
  @IsEnum(LedgerPartyType)
  partyType: LedgerPartyType;

  /** "true" => only parties with a non-zero balance */
  @IsOptional()
  @IsString()
  onlyOutstanding?: string;
}

/** Manual adjustment entry (write-off, correction, opening adjustment...) */
export class CreateLedgerAdjustmentDto {
  @IsEnum(LedgerPartyType)
  partyType: LedgerPartyType;

  @IsString()
  partyId: string;

  @IsEnum(LedgerEntryType)
  entryType: LedgerEntryType;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsDateString()
  entryDate?: string;

  @IsString()
  description: string;
}
