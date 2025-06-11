import { PrismaNeon } from "@prisma/adapter-neon"
import { PrismaClient } from "@prisma/client"


export const getPrisma = (database_url: string) => {
  const adapter = new PrismaNeon({ connectionString: database_url });
  const prisma = new PrismaClient({ adapter });
  return prisma;
}
