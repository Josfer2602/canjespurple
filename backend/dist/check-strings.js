"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function check() {
    const users = await prisma.user.findMany();
    console.log('|' + users.map(u => `"${u.email}"`).join(', ') + '|');
}
check().finally(() => prisma.$disconnect());
