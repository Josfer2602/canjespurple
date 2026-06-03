"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHistory = exports.createRedemption = void 0;
const db_1 = __importDefault(require("../config/db"));
const drive_service_1 = __importDefault(require("../services/drive.service"));
const createRedemption = async (req, res) => {
    try {
        const { projectId, visitId, pointId, ticketNumber, // Viene del frontend como ticketNumber
        purchaseAmount, // Viene del frontend como purchaseAmount
        consumerDni, photos, extraData } = req.body;
        console.log(`[REDEMPTION] Intentando para Visit:${visitId} - DNI:${consumerDni}`);
        // 1. Validar Visita
        const visit = await db_1.default.visit.findUnique({
            where: { id: visitId },
            include: {
                point: true,
                user: { include: { project: true } }
            }
        });
        if (!visit) {
            return res.status(404).json({ message: 'Sesión de visita no encontrada. Reinicia el punto.' });
        }
        // 2. Subir Fotos a Drive (Carpeta del Proyecto > Punto > Canje_DNI)
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        const projectFolderName = visit.user.project?.name || 'Varios';
        const pointFolderName = visit.point.name;
        const redemptionFolderName = `CANJE_${consumerDni}_${Date.now()}`;
        // Simulamos subida múltiple (en producción esto debería ser paralelo)
        const uploadedPhotos = [];
        for (const [key, base64] of Object.entries(photos)) {
            const url = await drive_service_1.default.uploadImage(base64, `${key}_${consumerDni}.jpg`, [projectFolderName, pointFolderName, redemptionFolderName], folderId);
            uploadedPhotos.push(url);
        }
        // 3. Guardar en DB
        const redemption = await db_1.default.redemption.create({
            data: {
                visitId,
                projectId,
                dni: consumerDni,
                amount: purchaseAmount, // Mapeamos purchaseAmount a field 'amount'
                ticketNo: ticketNumber, // Mapeamos ticketNumber a field 'ticketNo'
                reward: extraData?.reward || 'Promocional',
                photos: uploadedPhotos,
                extraData: extraData || {}
            }
        });
        // 4. Descontar Inventario
        const rewardItem = extraData?.reward;
        if (rewardItem) {
            try {
                await db_1.default.inventory.updateMany({
                    where: {
                        userId: visit.userId,
                        projectId,
                        itemName: rewardItem
                    },
                    data: {
                        stock: { decrement: 1 }
                    }
                });
                console.log(`✅ Stock descontado para ${rewardItem} (User: ${visit.userId})`);
            }
            catch (invErr) {
                console.error('⚠️ Error descontando inventario:', invErr);
                // No bloqueamos el canje si falla el stock, pero avisamos en logs
            }
        }
        res.json({ success: true, redemptionId: redemption.id });
    }
    catch (error) {
        console.error('❌ Error en Canje:', error);
        res.status(500).json({ message: 'Error interno en canje', detail: error.message });
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
