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

import { FleetOperationsService } from './fleet-operations.service.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

import { UserRole } from '../../generated/prisma/enums.js';

import {
  CreateDriverDto,
  UpdateDriverDto,
  CreateDriverDocumentDto,
  UpdateDriverDocumentDto,
  CreateVehicleDocumentDto,
  UpdateVehicleDocumentDto,
  CreateAssignmentDto,
  CreateMaintenanceDto,
  UpdateMaintenanceDto,
  CreateTyreDto,
  UpdateTyreDto,
  FitTyreDto,
  RemoveTyreDto,
} from './dto/fleet.dto.js';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  UserRole.ADMIN,
  UserRole.MANAGER,
  UserRole.DISPATCHER,
  UserRole.ACCOUNTANT,
)
export class FleetOperationsController {
  constructor(
    private readonly fleetService: FleetOperationsService,
  ) {}

  // =====================================================
  // 1. DRIVERS
  // =====================================================

  @Post('drivers')
  createDriver(@Req() req: any, @Body() dto: CreateDriverDto) {
    return this.fleetService.createDriver(req.user.companyId, dto);
  }

  @Get('drivers')
  findAllDrivers(
    @Req() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return this.fleetService.findAllDrivers(
      req.user.companyId,
      Math.max(1, Number(page) || 1),
      Math.min(100, Math.max(1, Number(limit) || 10)),
      search,
      status,
    );
  }

  @Get('drivers/:id')
  findDriver(@Req() req: any, @Param('id') id: string) {
    return this.fleetService.findDriver(req.user.companyId, id);
  }

  @Patch('drivers/:id')
  updateDriver(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
  ) {
    return this.fleetService.updateDriver(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Delete('drivers/:id')
  deactivateDriver(@Req() req: any, @Param('id') id: string) {
    return this.fleetService.deactivateDriver(req.user.companyId, id);
  }

  // =====================================================
  // 2. DRIVER DOCUMENTS
  // =====================================================

  @Post('drivers/:driverId/documents')
  createDriverDocument(
    @Req() req: any,
    @Param('driverId') driverId: string,
    @Body() dto: CreateDriverDocumentDto,
  ) {
    return this.fleetService.createDriverDocument(
      req.user.companyId,
      driverId,
      dto,
    );
  }

  @Get('drivers/:driverId/documents')
  findDriverDocuments(
    @Req() req: any,
    @Param('driverId') driverId: string,
  ) {
    return this.fleetService.findDriverDocuments(
      req.user.companyId,
      driverId,
    );
  }

  @Patch('driver-documents/:id')
  updateDriverDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateDriverDocumentDto,
  ) {
    return this.fleetService.updateDriverDocument(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Delete('driver-documents/:id')
  deleteDriverDocument(@Req() req: any, @Param('id') id: string) {
    return this.fleetService.deleteDriverDocument(
      req.user.companyId,
      id,
    );
  }

  // =====================================================
  // 3. VEHICLE DOCUMENTS
  // =====================================================

  @Post('vehicles/:vehicleId/documents')
  createVehicleDocument(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: CreateVehicleDocumentDto,
  ) {
    return this.fleetService.createVehicleDocument(
      req.user.companyId,
      vehicleId,
      dto,
    );
  }

  @Get('vehicles/:vehicleId/documents')
  findVehicleDocuments(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.fleetService.findVehicleDocuments(
      req.user.companyId,
      vehicleId,
    );
  }

  @Patch('vehicle-documents/:id')
  updateVehicleDocument(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDocumentDto,
  ) {
    return this.fleetService.updateVehicleDocument(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Delete('vehicle-documents/:id')
  deleteVehicleDocument(@Req() req: any, @Param('id') id: string) {
    return this.fleetService.deleteVehicleDocument(
      req.user.companyId,
      id,
    );
  }

  // =====================================================
  // 4. DRIVER-VEHICLE ASSIGNMENT
  // =====================================================

  @Post('driver-assignments')
  assignDriver(
    @Req() req: any,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.fleetService.assignDriver(
      req.user.companyId,
      dto,
    );
  }

  @Get('driver-assignments')
  findAssignments(
    @Req() req: any,
    @Query('activeOnly') activeOnly = 'true',
  ) {
    return this.fleetService.findAssignments(
      req.user.companyId,
      activeOnly !== 'false',
    );
  }

  @Patch('driver-assignments/:id/release')
  releaseDriver(@Req() req: any, @Param('id') id: string) {
    return this.fleetService.releaseDriver(
      req.user.companyId,
      id,
    );
  }

  // =====================================================
  // 5. VEHICLE MAINTENANCE
  // =====================================================

  @Post('vehicles/:vehicleId/maintenance')
  createMaintenance(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: CreateMaintenanceDto,
  ) {
    return this.fleetService.createMaintenance(
      req.user.companyId,
      vehicleId,
      dto,
    );
  }

  @Get('vehicles/:vehicleId/maintenance')
  findMaintenance(
    @Req() req: any,
    @Param('vehicleId') vehicleId: string,
  ) {
    return this.fleetService.findMaintenance(
      req.user.companyId,
      vehicleId,
    );
  }

  @Get('maintenance/:id')
  findMaintenanceById(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.fleetService.findMaintenanceById(
      req.user.companyId,
      id,
    );
  }

  @Patch('maintenance/:id')
  updateMaintenance(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateMaintenanceDto,
  ) {
    return this.fleetService.updateMaintenance(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Delete('maintenance/:id')
  deleteMaintenance(
    @Req() req: any,
    @Param('id') id: string,
  ) {
    return this.fleetService.deleteMaintenance(
      req.user.companyId,
      id,
    );
  }

  // =====================================================
  // 6. TYRES
  // =====================================================

  @Post('tyres')
  createTyre(@Req() req: any, @Body() dto: CreateTyreDto) {
    return this.fleetService.createTyre(req.user.companyId, dto);
  }

  @Get('tyres')
  findTyres(
    @Req() req: any,
    @Query('vehicleId') vehicleId?: string,
  ) {
    return this.fleetService.findTyres(
      req.user.companyId,
      vehicleId,
    );
  }

  @Patch('tyres/:id')
  updateTyre(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateTyreDto,
  ) {
    return this.fleetService.updateTyre(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Patch('tyres/:id/fit')
  fitTyre(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: FitTyreDto,
  ) {
    return this.fleetService.fitTyre(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Patch('tyres/:id/remove')
  removeTyre(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: RemoveTyreDto,
  ) {
    return this.fleetService.removeTyre(
      req.user.companyId,
      id,
      dto,
    );
  }

  @Delete('tyres/:id')
  deactivateTyre(@Req() req: any, @Param('id') id: string) {
    return this.fleetService.deactivateTyre(
      req.user.companyId,
      id,
    );
  }
}