
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

// import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
// import { RolesGuard } from '../../common/guards/roles.guard.js';
// import { Roles } from '../../common/decorators/roles.decorator.js';
import { UserRole } from '../../generated/prisma/enums.js';

import { TransportOperationsService } from './transport-operations.service.js';

import {
  CreateBookingDto,
  UpdateBookingDto,
  ChangeBookingStatusDto,
} from './dto/booking.dto.js';
import { CreateLorryReceiptDto } from './dto/lorry-receipt.dto.js';
import { CreateEwayBillDto } from './dto/eway-bill.dto.js';
import { CreatePodDto } from './dto/pod.dto.js';
import {
  CreateTripDto,
  UpdateTripDto,
  CompleteTripDto,
} from './dto/trip.dto.js';
import { CreateTripExpenseDto } from './dto/trip-expense.dto.js';
import { CreateFuelEntryDto } from './dto/fuel-entry.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.DISPATCHER,
  UserRole.ACCOUNTANT,
)
export class TransportOperationsController {
  constructor(
    private readonly service: TransportOperationsService,
  ) {}

  private context(req: any) {
    const companyId = req.user?.companyId;
    // JwtAuthGuard puts the JWT payload on req.user, where the user id is `sub`.
    const userId = req.user?.sub ?? req.user?.id;

    if (!companyId || !userId) {
      throw new Error('Authenticated user company context is missing');
    }

    return { companyId, userId };
  }

  // -------------------------------------------------------
  // BOOKINGS
  // -------------------------------------------------------

  @Post('bookings')
  createBooking(@Req() req: any, @Body() dto: CreateBookingDto) {
    const { companyId, userId } = this.context(req);
    return this.service.createBooking(companyId, userId, dto);
  }

  @Get('bookings')
  findAllBookings(@Req() req: any, @Query() query: any) {
    const { companyId } = this.context(req);
    return this.service.findAllBookings(companyId, query);
  }

  @Get('bookings/:id')
  findBooking(@Req() req: any, @Param('id') id: string) {
    const { companyId } = this.context(req);
    return this.service.findBooking(companyId, id);
  }

  @Patch('bookings/:id')
  updateBooking(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateBookingDto,
  ) {
    const { companyId } = this.context(req);
    return this.service.updateBooking(companyId, id, dto);
  }

  @Patch('bookings/:id/status')
  changeBookingStatus(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ChangeBookingStatusDto,
  ) {
    const { companyId, userId } = this.context(req);
    return this.service.changeBookingStatus(
      companyId,
      userId,
      id,
      dto,
    );
  }

  @Get('bookings/:id/history')
  getBookingHistory(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const { companyId } = this.context(req);
    return this.service.getBookingHistory(companyId, id);
  }

  // -------------------------------------------------------
  // LORRY RECEIPTS
  // -------------------------------------------------------

  @Post('lorry-receipts')
  createLorryReceipt(
    @Req() req: any,
    @Body() dto: CreateLorryReceiptDto,
  ) {
    const { companyId } = this.context(req);
    return this.service.createLorryReceipt(companyId, dto);
  }

  @Get('lorry-receipts')
  findAllLorryReceipts(@Req() req: any) {
    const { companyId } = this.context(req);
    return this.service.findAllLorryReceipts(companyId);
  }

  @Get('lorry-receipts/:id')
  findLorryReceipt(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    const { companyId } = this.context(req);
    return this.service.findLorryReceipt(companyId, id);
  }

  // -------------------------------------------------------
  // E-WAY BILLS
  // -------------------------------------------------------

  @Post('eway-bills')
  createEwayBill(
    @Req() req: any,
    @Body() dto: CreateEwayBillDto,
  ) {
    const { companyId } = this.context(req);
    return this.service.createEwayBill(companyId, dto);
  }

  @Get('eway-bills')
  findAllEwayBills(
    @Req() req: any,
    @Query() query: any,
  ) {
    const { companyId } = this.context(req);
    return this.service.findAllEwayBills(companyId, query);
  }

  @Patch('eway-bills/:id')
  updateEwayBill(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreateEwayBillDto>,
  ) {
    const { companyId } = this.context(req);
    return this.service.updateEwayBill(companyId, id, dto);
  }

  // -------------------------------------------------------
  // PROOF OF DELIVERY
  // -------------------------------------------------------

  @Post('pods')
  createPod(@Req() req: any, @Body() dto: CreatePodDto) {
    const { companyId } = this.context(req);
    return this.service.createPod(companyId, dto);
  }

  @Get('pods')
  findAllPods(@Req() req: any) {
    const { companyId } = this.context(req);
    return this.service.findAllPods(companyId);
  }

  @Patch('pods/:id')
  updatePod(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: Partial<CreatePodDto>,
  ) {
    const { companyId } = this.context(req);
    return this.service.updatePod(companyId, id, dto);
  }

  @Patch('pods/:id/verify')
  verifyPod(@Req() req: any, @Param('id') id: string) {
    const { companyId, userId } = this.context(req);
    return this.service.verifyPod(companyId, userId, id);
  }

  // -------------------------------------------------------
  // TRIPS / DISPATCH
  // -------------------------------------------------------

  @Post('trips')
  createTrip(@Req() req: any, @Body() dto: CreateTripDto) {
    const { companyId, userId } = this.context(req);
    return this.service.createTrip(companyId, userId, dto);
  }

  @Get('trips')
  findAllTrips(@Req() req: any, @Query() query: any) {
    const { companyId } = this.context(req);
    return this.service.findAllTrips(companyId, query);
  }

  @Get('trips/:id')
  findTrip(@Req() req: any, @Param('id') id: string) {
    const { companyId } = this.context(req);
    return this.service.findTrip(companyId, id);
  }

  @Patch('trips/:id')
  updateTrip(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    const { companyId } = this.context(req);
    return this.service.updateTrip(companyId, id, dto);
  }

  @Patch('trips/:id/start')
  startTrip(@Req() req: any, @Param('id') id: string) {
    const { companyId } = this.context(req);
    return this.service.startTrip(companyId, id);
  }

  @Patch('trips/:id/complete')
  completeTrip(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CompleteTripDto,
  ) {
    const { companyId } = this.context(req);
    return this.service.completeTrip(companyId, id, dto);
  }

  @Patch('trips/:id/cancel')
  cancelTrip(@Req() req: any, @Param('id') id: string) {
    const { companyId, userId } = this.context(req);
    return this.service.cancelTrip(companyId, userId, id);
  }

  // -------------------------------------------------------
  // TRIP EXPENSES
  // -------------------------------------------------------

  @Post('trips/:tripId/expenses')
  createTripExpense(
    @Req() req: any,
    @Param('tripId') tripId: string,
    @Body() dto: CreateTripExpenseDto,
  ) {
    const { companyId } = this.context(req);
    return this.service.createTripExpense(
      companyId,
      tripId,
      dto,
    );
  }

  @Get('trips/:tripId/expenses')
  findTripExpenses(
    @Req() req: any,
    @Param('tripId') tripId: string,
  ) {
    const { companyId } = this.context(req);
    return this.service.findTripExpenses(companyId, tripId);
  }

  @Patch('trip-expenses/:expenseId/approve')
  approveTripExpense(
    @Req() req: any,
    @Param('expenseId') expenseId: string,
  ) {
    const { companyId, userId } = this.context(req);
    return this.service.approveTripExpense(
      companyId,
      expenseId,
      userId,
    );
  }

  // -------------------------------------------------------
  // FUEL ENTRIES
  // -------------------------------------------------------

  @Post('fuel-entries')
  createFuelEntry(
    @Req() req: any,
    @Body() dto: CreateFuelEntryDto,
  ) {
    const { companyId } = this.context(req);
    return this.service.createFuelEntry(companyId, dto);
  }

  @Get('fuel-entries')
  findFuelEntries(
    @Req() req: any,
    @Query() query: any,
  ) {
    const { companyId } = this.context(req);
    return this.service.findFuelEntries(companyId, query);
  }

  @Get('vehicles/:vehicleId/fuel-summary')
  getFuelSummary(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
  ) {
    const { companyId } = this.context(req);
    return this.service.getFuelSummary(companyId, vehicleId);
  }
}
