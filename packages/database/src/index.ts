import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient as PrismaClientDb1 } from '@prisma/client-db1';
import { PrismaClient as PrismaClientDb2 } from '@prisma/client-db2';
import { PrismaClient as PrismaClientDb3 } from '@prisma/client-db3';

const globalForPrisma = globalThis as unknown as {
  prismaDb1: PrismaClientDb1 | undefined;
  prismaDb2: PrismaClientDb2 | undefined;
  prismaDb3: PrismaClientDb3 | undefined;
  pool1: pg.Pool | undefined;
  pool2: pg.Pool | undefined;
  pool3: pg.Pool | undefined;
};

// Connections
const urlDb1 = process.env.DB1_DATABASE_URL || process.env.DATABASE_URL;
const urlDb2 = process.env.DB2_DATABASE_URL || process.env.DATABASE_URL;
const urlDb3 = process.env.DB3_DATABASE_URL || process.env.DATABASE_URL;

// Pools
const pool1 = globalForPrisma.pool1 ?? new pg.Pool({ connectionString: urlDb1 });
const pool2 = globalForPrisma.pool2 ?? new pg.Pool({ connectionString: urlDb2 });
const pool3 = globalForPrisma.pool3 ?? new pg.Pool({ connectionString: urlDb3 });

// Client Instances
export const prismaDb1 =
  globalForPrisma.prismaDb1 ??
  new PrismaClientDb1({ adapter: new PrismaPg(pool1) });

export const prismaDb2 =
  globalForPrisma.prismaDb2 ??
  new PrismaClientDb2({ adapter: new PrismaPg(pool2) });

export const prismaDb3 =
  globalForPrisma.prismaDb3 ??
  new PrismaClientDb3({ adapter: new PrismaPg(pool3) });

// Fallback alias for legacy code
export const prisma = prismaDb1;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prismaDb1 = prismaDb1;
  globalForPrisma.prismaDb2 = prismaDb2;
  globalForPrisma.prismaDb3 = prismaDb3;
  globalForPrisma.pool1 = pool1;
  globalForPrisma.pool2 = pool2;
  globalForPrisma.pool3 = pool3;
}

export * from '@prisma/client-db1';
