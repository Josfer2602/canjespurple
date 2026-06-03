import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function force() {
  const passwordHash = await bcrypt.hash('btl12345', 10);
  
  // Find a project to attach to
  const project = await prisma.project.findFirst();
  if (!project) {
    console.error('No project found to attach user');
    return;
  }

  const user = await prisma.user.upsert({
    where: { email: 'admin@purplebtl.com' },
    update: { passwordHash, role: 'ADMIN', projectId: project.id },
    create: {
      email: 'admin@purplebtl.com',
      passwordHash,
      fullName: 'Administrador BTL',
      role: 'ADMIN',
      projectId: project.id
    }
  });
  
  console.log('✅ FORCE ADMIN CREATED:', user.email);
  await prisma.$disconnect();
}

force();
