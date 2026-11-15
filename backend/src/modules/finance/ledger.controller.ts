import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { LedgerPartyType, UserRole } from '../../generated/prisma/enums.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { LedgerService } from './ledger.service.js';
import { getContext } from './finance.utils.js';
import {
  CreateLedgerAdjustmentDto,
  LedgerStatementQueryDto,
  LedgerSummaryQueryDto,
} from './dto/ledger.dto.js';

@Controller('ledger')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.MANAGER, UserRole.ACCOUNTANT)
export class LedgerController {
  constructor(private readonly service: LedgerService) {}

  /** Outstanding balance of every customer / vendor / driver. */
  @Get('summary')
  summary(@Req() req: any, @Query() query: LedgerSummaryQueryDto) {
    const { companyId } = getContext(req);
    return this.service.getSummary(
      companyId,
      query.partyType,
      query.onlyOutstanding === 'true',
    );
  }

  @Post('adjustments')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  createAdjustment(@Req() req: any, @Body() dto: CreateLedgerAdjustmentDto) {
    const { companyId } = getContext(req);
    return this.service.createAdjustment(companyId, dto);
  }

  @Delete('adjustments/:id')
  @Roles(UserRole.ADMIN, UserRole.MANAGER)
  deleteAdjustment(@Req() req: any, @Param('id') id: string) {
    const { companyId } = getContext(req);
    return this.service.deleteAdjustment(companyId, id);
  }

  /** Posts the hire charges payable to the vendor of a completed trip. */
  @Post('vendor-trips/:tripId/post-hire')
  postVendorTripHire(@Req() req: any, @Param('tripId') tripId: string) {
    const { companyId } = getContext(req);
    return this.service.postVendorTripHire(companyId, tripId);
  }

  /** Statement with running balance. partyType: CUSTOMER | VENDOR | DRIVER */
  @Get(':partyType/:partyId')
  statement(
    @Req() req: any,
    @Param('partyType', new ParseEnumPipe(LedgerPartyType)) partyType: LedgerPartyType,
    @Param('partyId') partyId: string,
    @Query() query: LedgerStatementQueryDto,
  ) {
    const { companyId } = getContext(req);
    return this.service.getStatement(companyId, partyType, partyId, query);
  }
}
