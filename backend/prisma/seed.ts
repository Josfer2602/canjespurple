import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import process from 'process';

const prisma = new PrismaClient();

async function main() {
  // 1. Enable PostGIS Extension
  await prisma.$executeRawUnsafe('CREATE EXTENSION IF NOT EXISTS postgis;');

  // 2. Create a Mock Project
  const project = await prisma.project.upsert({
    where: { id: 'mock-project-id' },
    update: {},
    create: {
      id: 'mock-project-id',
      name: 'Verano 2026',
      clientName: 'Purple BTL Inc.',
      config: {
        unique_ticket_validation: true,
        max_extra_fields: 5,
        extra_fields: [
          { label: 'Producto Comprado', type: 'list', required: true, options: ['Camiseta', 'Gorra', 'Cuaderno'] }
        ],
        photo_slots: [
          { label: 'Foto Boleta', required: true },
          { label: 'Foto Premio', required: true }
        ]
      },
      status: 'ACTIVE'
    }
  });

  // 3. Create a Staff User
  const passwordHash = await bcrypt.hash('btl12345', 10);
  await prisma.user.upsert({
    where: { email: 'staff@purplebtl.com' },
    update: { passwordHash },
    create: {
      email: 'staff@purplebtl.com',
      passwordHash,
      fullName: 'Juan Canjista',
      role: 'STAFF',
      projectId: project.id
    }
  });

  // 4. Create an Admin User
  await prisma.user.upsert({
    where: { email: 'admin@purplebtl.com' },
    update: { passwordHash },
    create: {
      email: 'admin@purplebtl.com',
      passwordHash,
      fullName: 'Jose Admin',
      role: 'ADMIN',
      projectId: project.id
    }
  });

  // 5. Create Points (IDs que coincidan con el Frontend)
  const points = [
    { id: '1', name: 'Mercado Central - Pabellón A' },
    { id: '2', name: 'Supermercado Plaza Vea - Centro' },
    { id: '3', name: 'Feria Escolar Av. Brasil' },
  ];

  for (const p of points) {
    await prisma.point.upsert({
      where: { id: p.id },
      update: { name: p.name },
      create: { 
        id: p.id, 
        name: p.name, 
        projectId: project.id,
        address: 'Dirección de prueba'
      }
    });
  }

  // 6. Create a Redemption Rule
  await prisma.redemptionRule.create({
    data: {
      projectId: project.id,
      minPurchase: 50.00,
      maxPurchase: 100.00,
      rewardName: 'Camiseta Purple BTL',
      comboProducts: ['Pantalón', 'Zapatos']
    }
  });

  console.log('✅ Base de datos inicializada con éxito (Usuarios y Puntos)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
