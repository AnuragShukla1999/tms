
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PodStatus } from '../../../generated/prisma/enums.js';

export class CreatePodDto {
  @IsString()
  lorryReceiptId: string;

  @IsOptional()
  @IsEnum(PodStatus)
  status?: PodStatus;

  @IsOptional()
  @IsDateString()
  deliveredAt?: string;

  @IsOptional()
  @IsString()
  receivedBy?: string;

  @IsOptional()
  @IsString()
  receiverPhone?: string;

  @IsOptional()
  @IsString()
  signatureUrl?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  photoUrls?: string[];

  @IsOptional()
  @IsString()
  documentUrl?: string;

  @IsOptional()
  @IsString()
  damageNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  shortageQty?: number;
}

export class VerifyPodDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
