
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const ids = ["77065f5a-5c36-44ac-b23c-4c3d39a66ed1", "c787d52a-1a5f-4de1-88da-239eee25e381", "4f29d7c8-b4f1-45a5-8bb6-a0f9ada18a9a"];
  const projects = await prisma.project.findMany({
    where: { id: { in: ids } },
    select: { id: true }
  });
  console.log('Found projects:', projects);
  console.log('Provided IDs:', ids);
}

main().catch(console.error).finally(() => prisma.$disconnect());
