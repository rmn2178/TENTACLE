import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Conditional logging — verbose in development, errors only in production
const logLevel: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"];

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: logLevel,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
