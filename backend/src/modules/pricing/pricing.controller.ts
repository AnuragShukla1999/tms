import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { PricingService } from './pricing.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { UserRole } from '../../generated/prisma/enums.js';

import { CreateRouteDto, UpdateRouteDto } from './dto/route.dto.js';
import {
  CreateRateCardDto,
  UpdateRateCardDto,
} from './dto/rate-card.dto.js';
import {
  CreateQuotationDto,
  UpdateQuotationDto,
} from './dto/quotation.dto.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.DISPATCHER,
  UserRole.ACCOUNTANT,
)
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  // =====================================================
  // 8. ROUTES
  // =====================================================

  @Post('routes')
  createRoute(@Req() req: any, @Body() dto: CreateRouteDto) {
    return this.pricingService.createRoute(
      req.user.companyId,
      dto,
    );
  }

  @Get('routes')
  findAllRoutes(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.pricingService.findAllRoutes(
      req.user.companyId,
      search,
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(limit) || 10)),
    );
  }

  @Get('routes/:id')
  findRoute(@Req() req: any, @Param('id') id: string) {
    return this.pricingService.findRoute(
      req.user.companyId,
      id,
    );
  }

  @Patch('routes/:id')
  updateRoute(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRouteDto,
  ) {
    return this.pricingService.updateRoute(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Delete('routes/:id')
  deactivateRoute(@Req() req: any, @Param('id') id: string) {
    return this.pricingService.deactivateRoute(
      req.user.companyId,
      id,
    );
  }

  // =====================================================
  // 9. RATE CARDS
  // =====================================================

  @Post('rate-cards')
  createRateCard(
    @Req() req: any,
    @Body() dto: CreateRateCardDto,
  ) {
    return this.pricingService.createRateCard(
      req.user.companyId,
      dto,
    );
  }

  @Get('rate-cards')
  findAllRateCards(
    @Req() req: any,
    @Query('customerId') customerId?: string,
    @Query('routeId') routeId?: string,
    @Query('activeOnly') activeOnly = 'true',
  ) {
    return this.pricingService.findAllRateCards(
      req.user.companyId,
      customerId,
      routeId,
      activeOnly !== 'false',
    );
  }

  @Get('rate-cards/:id')
  findRateCard(@Req() req: any, @Param('id') id: string) {
    return this.pricingService.findRateCard(
      req.user.companyId,
      id,
    );
  }

  @Patch('rate-cards/:id')
  updateRateCard(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRateCardDto,
  ) {
    return this.pricingService.updateRateCard(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Delete('rate-cards/:id')
  deactivateRateCard(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.pricingService.deactivateRateCard(
      req.user.companyId,
      id,
    );
  }

  // =====================================================
  // 10. QUOTATIONS
  // =====================================================

  @Post('quotations')
  createQuotation(
    @Req() req: any,
    @Body() dto: CreateQuotationDto,
  ) {
    return this.pricingService.createQuotation(
      req.user.companyId,
      dto,
    );
  }

  @Get('quotations')
  findAllQuotations(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.pricingService.findAllQuotations(
      req.user.companyId,
      status,
      customerId,
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(limit) || 10)),
    );
  }

  @Get('quotations/:id')
  findQuotation(@Req() req: any, @Param('id') id: string) {
    return this.pricingService.findQuotation(
      req.user.companyId,
      id,
    );
  }

  @Patch('quotations/:id')
  updateQuotation(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateQuotationDto,
  ) {
    return this.pricingService.updateQuotation(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Patch('quotations/:id/send')
  sendQuotation(@Req() req: any, @Param('id') id: string) {
    return this.pricingService.sendQuotation(
      req.user.companyId,
      id,
    );
  }

  @Patch('quotations/:id/accept')
  acceptQuotation(@Req() req: any, @Param('id') id: string) {
    return this.pricingService.acceptQuotation(
      req.user.companyId,
      id,
    );
  }

  @Patch('quotations/:id/reject')
  rejectQuotation(@Req() req: any, @Param('id') id: string) {
    return this.pricingService.rejectQuotation(
      req.user.companyId,
      id,
    );
  }
}