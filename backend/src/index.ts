import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import authRoutes from './routes/auth.routes';
import redemptionRoutes from './routes/redemption.routes';
import visitRoutes from './routes/visit.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import voucherRoutes from './routes/voucher.routes';
import importRoutes from './routes/import.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({ 
  origin: function (origin, callback) {
    // Permitir cualquier origen local o los origenes de produccion
    if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://192.168.') || origin === process.env.FRONTEND_URL || origin === 'https://canjes.simplegoapp.de') {
      callback(null, true);
    } else {
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Logging Middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/redemptions', redemptionRoutes);
app.use('/api/visits', visitRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/import', importRoutes);

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'BTL SaaS API'
  });
});

// Start Server
app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`🚀 Server listening on port ${PORT} (including local network)`);
});

export default app;
