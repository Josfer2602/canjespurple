import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
  const email = 'admin@purplebtl.com';
  const password = 'btl12345';

  const user = await prisma.user.findUnique({
    where: { email }
  });

  if (!user) {
    console.log('User not found');
    return;
  }

  console.log('User found:', user.email);
  console.log('Stored Hash:', user.passwordHash);

  const isValid = await bcrypt.compare(password, user.passwordHash);
  console.log('Is valid?', isValid);
}

testLogin()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
