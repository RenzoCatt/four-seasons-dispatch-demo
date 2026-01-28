import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const runtime = "nodejs";

const db = process.env.DATABASE_URL || "";
const direct = process.env.DIRECT_URL || "";

console.error("DATABASE_URL host:", db.split("@")[1]?.split("/")[0] || "(missing)");
console.error("DIRECT_URL host:", direct.split("@")[1]?.split("/")[0] || "(missing)");

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Debug log for Vercel
if (process.env.VERCEL) {
  console.error("DB HOST:", (process.env.DATABASE_URL || "").split("@")[1]?.split("/")[0]);
  console.error("DATABASE_URL present:", !!process.env.DATABASE_URL);
  console.error("DIRECT_URL present:", !!process.env.DIRECT_URL);
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
