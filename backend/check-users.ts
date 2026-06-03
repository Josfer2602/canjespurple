import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.user.findMany();
  console.log('--- USERS ---');
  console.log(JSON.stringify(users, null, 2));
  console.log('------------');
  await prisma.$disconnect();
}

check();
