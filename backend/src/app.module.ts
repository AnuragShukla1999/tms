import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module.js';
import { CompanyModule } from './modules/company/company.module.js';
import { PrismaModule } from './database/prisma.module.js';
import { BranchModule } from './modules/branch/branch.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { CustomersModule } from './modules/customers/customers.module.js';
import { VehiclesModule } from './modules/vehicles/vehicles.module.js';
import { FleetOperationsModule } from './modules/fleet-operations/fleet-operations.module.js';
import { PricingModule } from './modules/pricing/pricing.module.js';
import { TransportOperationsModule } from './modules/transport-operations/transport-operations.module.js';
import { FinanceModule } from './modules/finance/finance.module.js';
import { VendorsModule } from './modules/vendors/vendors.module.js';

@Module({
   imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      // validationSchema: Joi.object({
      //   NODE_ENV: Joi.string()
      //     .valid('development', 'production', 'test')
      //     .default('development'),
      //   PORT: Joi.number().default(3000),
      //   HOST: Joi.string().default('0.0.0.0'),
      //   DATABASE_URL: Joi.string().required(),
      //   CORS_ORIGINS: Joi.string().allow('').default(''),
      // }),
    }),
    PrismaModule,
    AuthModule,
    CompanyModule,
    BranchModule,
    UsersModule,
    CustomersModule,
    VehiclesModule,
    FleetOperationsModule,
    PricingModule,
    TransportOperationsModule,
    FinanceModule,
    VendorsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
