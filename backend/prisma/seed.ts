import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import * as bcrypt from 'bcrypt';
import { PrismaClient, UserRole } from '../src/generated/prisma/client.js';

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });

  const prisma = new PrismaClient({
    adapter,
  });

  try {
    const email = process.env.SUPER_ADMIN_EMAIL!;

    const password = process.env.SUPER_ADMIN_PASSWORD!;

    const passwordHash = await bcrypt.hash(password, 12);

    const existingAdmin = await prisma.user.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      if (existingAdmin.role !== UserRole.SUPER_ADMIN) {
        throw new Error(
          'The configured email already belongs to a non-super-admin user.',
        );
      }

      console.log('Super Admin already exists');
      return;
    }

    await prisma.user.create({
      data: {
        name: process.env.SUPER_ADMIN_NAME!,
        email,
        phone: process.env.SUPER_ADMIN_PHONE!,
        passwordHash,
        role: UserRole.SUPER_ADMIN,
        companyId: null,
        branchId: null,
        isActive: true,
      },
    });

    console.log('Super Admin created successfully');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});