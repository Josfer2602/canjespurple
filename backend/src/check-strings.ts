import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log('|' + users.map(u => `"${u.email}"`).join(', ') + '|');
}

check().finally(() => prisma.$disconnect());
