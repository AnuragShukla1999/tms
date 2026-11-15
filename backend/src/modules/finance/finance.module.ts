import { Module } from '@nestjs/common';

import { PrismaModule } from '../../database/prisma.module.js';
// JwtAuthGuard needs JwtService, which AuthModule exports.
import { AuthModule } from '../auth/auth.module.js';

import { LedgerService } from './ledger.service.js';
import { InvoicesService } from './invoices.service.js';
import { PaymentsService } from './payments.service.js';
import { DriverTransactionsService } from './driver-transactions.service.js';
import { OfficeExpensesService } from './office-expenses.service.js';

import { LedgerController } from './ledger.controller.js';
import { InvoicesController } from './invoices.controller.js';
import {
  CustomerPaymentsController,
  VendorPaymentsController,
} from './payments.controller.js';
import { DriverTransactionsController } from './driver-transactions.controller.js';
import { OfficeExpensesController } from './office-expenses.controller.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [
    InvoicesController,
    CustomerPaymentsController,
    VendorPaymentsController,
    DriverTransactionsController,
    OfficeExpensesController,
    LedgerController,
  ],
  providers: [
    LedgerService,
    InvoicesService,
    PaymentsService,
    DriverTransactionsService,
    OfficeExpensesService,
  ],
  exports: [LedgerService, InvoicesService],
})
export class FinanceModule {}
