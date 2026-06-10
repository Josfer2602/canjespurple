"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkDniLimit = exports.getHistory = exports.createRedemption = void 0;
const db_1 = __importDefault(require("../config/db"));
const drive_service_1 = __importDefault(require("../services/drive.service"));
const createRedemption = async (req, res) => {
    try {
        const { projectId, visitId, ticketNumber, purchaseAmount, consumerDni, photos, extraData, coords, voucherId, items // { presentationId, quantity }[]
         } = req.body;
        console.log(`[REDEMPTION] Intentando para Visit:${visitId} - DNI:${consumerDni}`);
        // 1. Validar campos requeridos
        if (!visitId || !consumerDni || !projectId) {
            return res.status(400).json({ message: 'Faltan campos requeridos: visitId, consumerDni, projectId' });
        }
        let voucher = null;
        let uploadedPhotos = [];
        // 3. Validar Visita
        const visit = await db_1.default.visit.findUnique({
            where: { id: visitId },
            include: {
                point: true,
                market: true,
                user: { include: { project: true } }
            }
        });
        if (!visit) {
            return res.status(404).json({ message: 'Sesión de visita no encontrada. Reinicia el punto.' });
        }
        if (voucherId) {
            // Flujo B2B2C: El ticket ya fue subido a drive y aprobado por PDV
            voucher = await db_1.default.voucher.findUnique({ where: { id: voucherId } });
            if (!voucher || voucher.status !== 'APPROVED') {
                return res.status(400).json({ message: 'Voucher inválido o no está en estado APROBADO.' });
            }
            uploadedPhotos = Array.isArray(voucher.photos) ? voucher.photos : [];
            console.log(`✅ Usando fotos desde Voucher: ${voucher.code}`);
        }
        else {
            // Flujo Directo de Staff
            // 2. Validar que haya fotos
            if (!photos || Object.keys(photos).length === 0) {
                return res.status(400).json({ message: 'Debes adjuntar al menos una foto como evidencia.' });
            }
            // 5. Subir fotos a Drive OBLIGATORIAMENTE
            const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
            const projectFolderName = visit.user.project?.name || 'Varios';
            const pointFolderName = visit.point?.name || visit.market?.name || 'General';
            const today = new Date().toISOString().split('T')[0];
            console.log(`[DRIVE] Subiendo ${Object.keys(photos).length} foto(s) para DNI:${consumerDni}...`);
            for (const [key, base64] of Object.entries(photos)) {
                const url = await drive_service_1.default.uploadImage(base64, `${key}_${Date.now()}.jpg`, [projectFolderName, pointFolderName, today, consumerDni], folderId);
                uploadedPhotos.push(url);
                console.log(`✅ Foto subida: ${url}`);
            }
            console.log(`✅ Todas las fotos subidas a Drive (${uploadedPhotos.length})`);
        }
        // 4.5 Validar Límite de Aprobación
        let redemptionStatus = 'APPROVED';
        if (visit.market && visit.market.requiresApproval && visit.market.approvalLimit !== null) {
            const limit = Number(visit.market.approvalLimit);
            const amountToCheck = purchaseAmount || 0;
            // Also consider if they are using quantity instead of amount
            const quantityToCheck = items ? items.reduce((acc, curr) => acc + (parseInt(curr.quantity) || 1), 0) : 0;
            if (amountToCheck > limit || quantityToCheck > limit) {
                redemptionStatus = 'PENDING';
                console.log(`[APPROVAL] Canje marcado como PENDIENTE. Supera el límite de ${limit}`);
            }
        }
        // 5. Guardar canje en DB con URLs de Drive
        const redemption = await db_1.default.redemption.create({
            data: {
                visitId,
                projectId,
                dni: consumerDni,
                amount: purchaseAmount || 0,
                ticketNo: ticketNumber || '',
                reward: extraData?.reward || 'Promocional',
                photos: uploadedPhotos,
                extraData: extraData || {},
                voucherId: voucherId || null,
                status: redemptionStatus,
                ...(items && items.length > 0 && {
                    items: {
                        create: items.map((item) => ({
                            productName: item.productName || item.presentationId,
                            quantity: parseInt(item.quantity, 10) || 1
                        }))
                    }
                })
            }
        });
        if (voucherId) {
            await db_1.default.voucher.update({ where: { id: voucherId }, data: { status: 'REDEEMED' } });
        }
        console.log(`✅ Canje guardado en DB: ${redemption.id} (${redemptionStatus})`);
        // 6. Descontar Inventario SOLO si está aprobado
        if (redemptionStatus === 'APPROVED') {
            const rewardItem = extraData?.reward;
            if (rewardItem) {
                try {
                    const whereInv = { projectId, itemName: rewardItem };
                    if (visit.pointId) {
                        whereInv.pointId = visit.pointId;
                    }
                    else if (visit.marketId) {
                        whereInv.marketId = visit.marketId;
                    }
                    else {
                        whereInv.userId = visit.userId;
                    }
                    await db_1.default.inventory.updateMany({
                        where: whereInv,
                        data: { stock: { decrement: 1 } }
                    });
                    console.log(`✅ Stock descontado para: ${rewardItem}`);
                }
                catch (invErr) {
                    console.error('⚠️ Error descontando inventario:', invErr);
                }
            }
        }
        // 7. Marcar Ubicación del Canje (PostGIS)
        if (coords && coords.lat && coords.lng) {
            try {
                const lat = parseFloat(coords.lat);
                const lng = parseFloat(coords.lng);
                await db_1.default.$executeRaw `
          UPDATE "Redemption" 
          SET location = ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326) 
          WHERE id = ${redemption.id}
        `;
                console.log(`✅ Coordenadas guardadas para canje: ${redemption.id}`);
            }
            catch (geoErr) {
                console.error('⚠️ Error guardando coordenadas:', geoErr);
            }
        }
        res.json({ success: true, redemptionId: redemption.id, status: redemptionStatus });
    }
    catch (error) {
        console.error('❌ Error en Canje:', error);
        // Si el error es de Drive, dar un mensaje claro al usuario
        if (error.message?.includes('drive') || error.message?.includes('googleapis') || error.code === 403) {
            return res.status(503).json({
                message: 'No se pudo subir la evidencia fotográfica a Google Drive. Verifica tu conexión a internet e inténtalo de nuevo.',
                detail: error.message
            });
        }
        res.status(500).json({ message: 'Error interno al registrar el canje', detail: error.message });
    }
};
exports.createRedemption = createRedemption;
const getHistory = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ message: 'Se requiere userId' });
        }
        const redemptions = await db_1.default.redemption.findMany({
            where: {
                visit: {
                    userId: String(userId),
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
            include: {
                visit: {
                    include: {
                        point: true,
                    },
                },
            },
            take: 50, // Limit to recent 50 for mobile
        });
        res.json(redemptions);
    }
    catch (error) {
        console.error('❌ Error obteniendo historial:', error);
        res.status(500).json({ message: 'Error interno obteniendo historial', detail: error.message });
    }
};
exports.getHistory = getHistory;
const checkDniLimit = async (req, res) => {
    try {
        const { dni, projectId } = req.query;
        if (!dni || !projectId)
            return res.status(400).json({ message: 'Faltan parámetros' });
        const project = await db_1.default.project.findUnique({ where: { id: projectId } });
        if (!project)
            return res.status(404).json({ message: 'Proyecto no encontrado' });
        const maxPerDni = project.config?.max_redemptions_per_dni;
        if (maxPerDni && maxPerDni > 0) {
            const redemptionCount = await db_1.default.redemption.count({
                where: { dni: dni, projectId: projectId }
            });
            if (redemptionCount >= maxPerDni) {
                return res.json({
                    allowed: false,
                    message: `Límite alcanzado: Este DNI ya cuenta con ${redemptionCount} canjes en esta campaña y el máximo permitido es ${maxPerDni}.`
                });
            }
        }
        return res.json({ allowed: true });
    }
    catch (err) {
        res.status(500).json({ message: 'Error validando DNI', detail: err.message });
    }
};
exports.checkDniLimit = checkDniLimit;
