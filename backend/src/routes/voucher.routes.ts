import { Router } from 'express';
import { 
  createVoucher, 
  getPdvVouchers, 
  approveVoucher, 
  verifyVoucherCode,
  checkVoucherStatus,
  getPointInfo,
  getProxyPhoto
} from '../controllers/voucher.controller';

const router = Router();

// ────────────────────────────────────────────────
// RUTAS ESTÁTICAS primero (antes de cualquier :id)
// ────────────────────────────────────────────────

// Pública - Cliente Scanner
router.post('/create', createVoucher);
router.get('/point-info/:id', getPointInfo);
router.get('/photo/:fileId', getProxyPhoto);

// PDV
router.get('/pdv-pending', getPdvVouchers);
router.post('/pdv-approve', approveVoucher);

// Staff Canjista
router.get('/verify', verifyVoucherCode);

// ─────────────────────────────────────────────────────────
// RUTAS DINÁMICAS al final para no absorber rutas estáticas
// ─────────────────────────────────────────────────────────
router.get('/:id/status', checkVoucherStatus);

export default router;
