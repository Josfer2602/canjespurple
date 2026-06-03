import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: {
      project: true
    }
  });
  console.log('Total users:', users.length);
  users.forEach(u => {
    console.log(`- Email: ${u.email}, Role: ${u.role}, Project: ${u.project?.name || 'N/A'}, Active: ${u.isActive}`);
  });
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
