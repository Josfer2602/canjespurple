"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function testLimit() {
    const projectId = '9f9bfa36-9414-493f-9ade-a57d2f291cbb'; // Use an existing project ID from previous logs
    const consumerDni = 'TEST' + Date.now();
    console.log('--- TEST: DNI LIMIT ---');
    // 1. Set limit to 1
    await prisma.project.update({
        where: { id: projectId },
        data: {
            config: {
                max_redemptions_per_dni: 1,
                // Keep other config if possible, but for a test script it's fine
                photo_slots: [{ label: 'Foto Boleta', key: 'ticket', required: true }],
                extra_fields: [],
                redemption_unit: 'amount'
            }
        }
    });
    console.log('Limit set to 1 for project:', projectId);
    // 2. Count existing (should be 0 for this new DNI)
    const count0 = await prisma.redemption.count({ where: { dni: consumerDni, projectId } });
    console.log('Current redemptions for DNI', consumerDni, ':', count0);
    // 3. Create one redemption manually
    // Need a visitId
    const visit = await prisma.visit.findFirst({ where: { user: { projectId } } });
    if (!visit) {
        console.error('No visit found for project');
        return;
    }
    await prisma.redemption.create({
        data: {
            visitId: visit.id,
            projectId,
            dni: consumerDni,
            amount: 10,
            ticketNo: 'TEST-1',
            reward: 'Premio Test',
            photos: []
        }
    });
    console.log('First redemption created successfully.');
    // 4. Try to find it again (should be 1)
    const count1 = await prisma.redemption.count({ where: { dni: consumerDni, projectId } });
    console.log('New count for DNI', consumerDni, ':', count1);
    if (count1 >= 1) {
        console.log('SUCCESS: Validation logic in controller should now block the second attempt.');
    }
    else {
        console.log('FAILURE: Count didn\'t increase.');
    }
    await prisma.$disconnect();
}
testLimit().catch(console.error);
