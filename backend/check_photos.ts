import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPhotos() {
  const redemptions = await prisma.redemption.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log("--- LATEST REDEMPTIONS PHOTOS ---");
  redemptions.forEach(r => {
    console.log(`Redemption ID: ${r.id}`);
    console.log(`Photos:`, r.photos);
  });

  const vouchers = await prisma.voucher.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log("--- LATEST VOUCHERS PHOTOS ---");
  vouchers.forEach(v => {
    console.log(`Voucher ID: ${v.id}`);
    console.log(`Photos:`, v.photos);
  });
}

checkPhotos().catch(console.error).finally(() => prisma.$disconnect());
