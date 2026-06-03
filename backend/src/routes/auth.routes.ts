import { Router } from 'express';
import { login } from '../controllers/auth.controller';

const router = Router();

router.post('/login', login);

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
  } catch (err: any) {
    res.send(err.message);
  }
});

export default router;
