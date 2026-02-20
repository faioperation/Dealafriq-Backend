import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

prisma
  .$connect()
  .then(() => console.log("✅ Prisma connected to PostgreSQL"))
  .catch((err) => console.error("❌ Prisma connection error:", err));

export default prisma;
