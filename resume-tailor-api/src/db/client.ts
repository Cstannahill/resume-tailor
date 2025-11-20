import { PrismaClient } from '@prisma/client';
import { env } from '../config/env.js';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

const createPrismaClient = () =>
  new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL
      }
    },
    log: env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error']
  });

export const prisma = globalThis.prisma ?? createPrismaClient();

if (env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma;
}
