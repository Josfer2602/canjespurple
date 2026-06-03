import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function reset() {
  const passwordHash = await bcrypt.hash('btl12345', 10);
  console.log('New hash for btl12345:', passwordHash);
  
  const user = await prisma.user.update({
    where: { email: 'admin@purplebtl.com' },
    data: { passwordHash }
  });
  
  console.log('✅ Updated user:', user.email);
  await prisma.$disconnect();
}

reset();
