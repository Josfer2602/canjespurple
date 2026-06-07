"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.login);
router.get('/rescue', async (req, res) => {
    try {
        const bcrypt = require('bcryptjs');
        const { default: prisma } = require('../config/db');
        const passwordHash = await bcrypt.hash('admin123', 10);
        const user = await prisma.user.upsert({
            where: { email: 'rescue@admin.com' },
            update: { passwordHash },
            create: {
                email: 'rescue@admin.com',
                fullName: 'Administrador de Rescate',
                passwordHash,
                role: 'ADMIN'
            }
        });
        res.json({ message: 'OK', email: user.email, pass: 'admin123' });
    }
    catch (err) {
        res.send(err.message);
    }
});
exports.default = router;
