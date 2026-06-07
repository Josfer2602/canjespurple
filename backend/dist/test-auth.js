"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
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
    const isValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    console.log('Is valid?', isValid);
}
testLogin()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
