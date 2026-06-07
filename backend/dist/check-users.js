"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
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
