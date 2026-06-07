"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const voucher_controller_1 = require("../controllers/voucher.controller");
const router = (0, express_1.Router)();
// ────────────────────────────────────────────────
// RUTAS ESTÁTICAS primero (antes de cualquier :id)
// ────────────────────────────────────────────────
// Pública - Cliente Scanner
router.post('/create', voucher_controller_1.createVoucher);
router.get('/point-info/:id', voucher_controller_1.getPointInfo);
router.get('/photo/:fileId', voucher_controller_1.getProxyPhoto);
// PDV
router.get('/pdv-pending', voucher_controller_1.getPdvVouchers);
router.post('/pdv-approve', voucher_controller_1.approveVoucher);
// Staff Canjista
router.get('/verify', voucher_controller_1.verifyVoucherCode);
// ─────────────────────────────────────────────────────────
// RUTAS DINÁMICAS al final para no absorber rutas estáticas
// ─────────────────────────────────────────────────────────
router.get('/:id/status', voucher_controller_1.checkVoucherStatus);
exports.default = router;
