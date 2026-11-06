import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import "server-only";

const prismaGlobal = globalThis as unknown as { prisma?: PrismaClient; pool?: Pool };
const pool = prismaGlobal.pool ?? new Pool({ connectionString: process.env.POSTGRES_URL, max: 8, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000 });
const adapter = new PrismaPg(pool);

export const prisma = prismaGlobal.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.prisma = prisma;
  prismaGlobal.pool = pool;
}
