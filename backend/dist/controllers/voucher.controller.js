"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProxyPhoto = exports.checkVoucherStatus = exports.verifyVoucherCode = exports.approveVoucher = exports.getPdvVouchers = exports.getPointInfo = exports.createVoucher = void 0;
const db_1 = __importDefault(require("../config/db"));
const drive_service_1 = __importDefault(require("../services/drive.service"));
// Generador de códigos únicos (Ej. A4X-9B)
const generateCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 5; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result.slice(0, 3) + '-' + result.slice(3);
};
const createVoucher = async (req, res) => {
    try {
        const { projectId, pointId, dni, phone, ticketNo, amount, photos, extraData } = req.body;
        if (!projectId || !pointId || !dni || !photos) {
            return res.status(400).json({ message: 'Faltan campos requeridos.' });
        }
        const point = await db_1.default.point.findUnique({
            where: { id: pointId },
            include: { project: true }
        });
        if (!point)
            return res.status(404).json({ message: 'Punto de Venta no encontrado.' });
        // Validar límite de DNI si existe
        const maxPerDni = point.project.config?.max_redemptions_per_dni;
        if (maxPerDni && maxPerDni > 0) {
            const existing = await db_1.default.redemption.count({ where: { dni, projectId } });
            if (existing >= maxPerDni) {
                return res.status(403).json({ message: 'Límite de canjes alcanzado para este DNI.' });
            }
        }
        // Subir a Drive
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const projectFolderName = point.project.name;
        const pointFolderName = point.name;
        const today = new Date().toISOString().split('T')[0];
        const uploadedPhotos = [];
        for (const [key, base64] of Object.entries(photos)) {
            const url = await drive_service_1.default.uploadImage(base64, `${key}_${Date.now()}.jpg`, [projectFolderName, pointFolderName, today, 'Vouchers', dni], folderId);
            uploadedPhotos.push(url);
        }
        // Asegurar código único
        let code = generateCode();
        while (await db_1.default.voucher.findUnique({ where: { code } })) {
            code = generateCode();
        }
        const voucher = await db_1.default.voucher.create({
            data: {
                code,
                projectId,
                pointId,
                dni,
                phone: phone || '',
                ticketNo: ticketNo || '',
                amount: amount || 0,
                extraData: extraData || {},
                photos: uploadedPhotos,
                status: 'PENDING'
            }
        });
        res.json({ success: true, voucher });
    }
    catch (err) {
        console.error('Error creating voucher:', err);
        res.status(500).json({ message: 'Error interno guardando la solicitud.', detail: err.message });
    }
};
exports.createVoucher = createVoucher;
const getPointInfo = async (req, res) => {
    try {
        const { id } = req.params;
        const point = await db_1.default.point.findUnique({
            where: { id },
            include: {
                project: {
                    select: { name: true, logoUrl: true, config: true }
                }
            }
        });
        if (!point)
            return res.status(404).json({ message: 'Punto no encontrado.' });
        if (!point.project.config?.requires_qr_validation) {
            return res.status(403).json({ message: 'Este proyecto no tiene activa la validación por QR.' });
        }
        res.json(point);
    }
    catch (err) {
        res.status(500).json({ message: 'Error interno obteniendo punto.', detail: err.message });
    }
};
exports.getPointInfo = getPointInfo;
const getPdvVouchers = async (req, res) => {
    try {
        const { pointId } = req.query;
        if (!pointId)
            return res.status(400).json({ message: 'Falta pointId.' });
        const vouchers = await db_1.default.voucher.findMany({
            where: { pointId: String(pointId), status: 'PENDING' },
            orderBy: { createdAt: 'asc' }
        });
        res.json(vouchers);
    }
    catch (err) {
        res.status(500).json({ message: 'Error listando solicitudes', detail: err.message });
    }
};
exports.getPdvVouchers = getPdvVouchers;
const approveVoucher = async (req, res) => {
    try {
        const { voucherId, status } = req.body; // status: APPROVED or REJECTED
        if (!voucherId || !status)
            return res.status(400).json({ message: 'Falta voucherId o status.' });
        const voucher = await db_1.default.voucher.update({
            where: { id: voucherId },
            data: { status }
        });
        res.json({ success: true, voucher });
    }
    catch (err) {
        res.status(500).json({ message: 'Error actualizando estado', detail: err.message });
    }
};
exports.approveVoucher = approveVoucher;
const verifyVoucherCode = async (req, res) => {
    try {
        const { code, projectId } = req.query;
        if (!code)
            return res.status(400).json({ message: 'Falta el código de voucher.' });
        const voucher = await db_1.default.voucher.findFirst({
            where: {
                code: String(code).toUpperCase(),
                projectId: projectId ? String(projectId) : undefined
            },
            include: { point: true }
        });
        if (!voucher)
            return res.status(404).json({ message: 'Código no encontrado o inválido.' });
        if (voucher.status === 'PENDING')
            return res.status(400).json({ message: 'Este código aún no ha sido aprobado por el Punto de Venta.' });
        if (voucher.status === 'REJECTED')
            return res.status(400).json({ message: 'Este código fue RECHAZADO por el Punto de Venta.' });
        if (voucher.status === 'REDEEMED')
            return res.status(400).json({ message: 'Este código YA FUE CANJEADO anteriormente.' });
        res.json(voucher);
    }
    catch (err) {
        res.status(500).json({ message: 'Error buscando código', detail: err.message });
    }
};
exports.verifyVoucherCode = verifyVoucherCode;
// Check for client polling
const checkVoucherStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const voucher = await db_1.default.voucher.findUnique({ where: { id } });
        if (!voucher)
            return res.status(404).json({ message: 'Voucher no encontrado' });
        res.json({ status: voucher.status, code: voucher.status === 'APPROVED' ? voucher.code : null });
    }
    catch (err) {
        res.status(500).json({ message: 'Error interno' });
    }
};
exports.checkVoucherStatus = checkVoucherStatus;
const getProxyPhoto = async (req, res) => {
    try {
        const { fileId } = req.params;
        if (!fileId)
            return res.status(400).send('No fileId');
        const stream = await drive_service_1.default.getFileStream(fileId);
        res.setHeader('Content-Type', 'image/jpeg');
        stream.pipe(res);
    }
    catch (err) {
        console.error('Error proxying photo:', err);
        res.status(500).send('Error loading image via proxy');
    }
};
exports.getProxyPhoto = getProxyPhoto;
