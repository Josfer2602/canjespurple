"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdminVisits = exports.deleteRedemption = exports.updateRedemption = exports.getAdminRedemptions = exports.deactivateInventory = exports.deleteRule = exports.updatePoint = exports.deletePoint = exports.deleteStaff = exports.deleteProject = exports.getInventory = exports.createProject = exports.getProjects = exports.getProject = exports.updateProjectConfig = exports.generatePdvAccess = exports.deleteMarket = exports.createMarket = exports.getMarkets = exports.createPoint = exports.getPoints = exports.createStaff = exports.saveRule = exports.getRules = exports.getInventoryLogs = exports.assignStock = exports.getStaff = exports.resetData = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = __importDefault(require("../config/db"));
// 1. Reset System Data ( transactional cleanup )
const resetData = async (req, res) => {
    try {
        const { projectId } = req.body;
        if (!projectId) {
            return res.status(400).json({ message: 'Project ID is required' });
        }
        // Wiping transactional data for the project
        // Note: We don't delete Users or the Project itself to maintain auth access
        await db_1.default.redemption.deleteMany({ where: { projectId } });
        await db_1.default.visit.deleteMany({ where: { point: { projectId } } });
        await db_1.default.dniHistory.deleteMany({ where: { projectId } });
        await db_1.default.inventory.deleteMany({ where: { projectId } });
        // Optional: Delete points if starting a completely new physical layout
        // await prisma.point.deleteMany({ where: { projectId } });
        res.json({ success: true, message: 'Data cleared successfully. Transactional history wiped.' });
    }
    catch (error) {
        console.error('Reset error:', error);
        res.status(500).json({ message: 'Error performing system reset', detail: error.message });
    }
};
exports.resetData = resetData;
// 2. Manage Staff (Field Workers)
const getStaff = async (req, res) => {
    try {
        const { projectId } = req.query;
        const staff = await db_1.default.user.findMany({
            where: {
                projectId: projectId
            },
            select: { id: true, email: true, fullName: true, role: true, isActive: true, createdAt: true }
        });
        res.json(staff);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching staff', detail: error.message });
    }
};
exports.getStaff = getStaff;
// 2.1 Assign Stock to Staff
const assignStock = async (req, res) => {
    try {
        const { userId, marketId, pointId, projectId, itemName, stockToAdd, threshold } = req.body;
        if ((!userId && !marketId && !pointId) || !projectId || !itemName) {
            return res.status(400).json({ message: 'Se requiere UserId, MarketId o PointId, además de ProjectId e ItemName' });
        }
        const inventory = await db_1.default.$transaction(async (tx) => {
            // Build where clause to find existing
            const whereExisting = { projectId, itemName };
            if (userId)
                whereExisting.userId = userId;
            if (marketId)
                whereExisting.marketId = marketId;
            if (pointId)
                whereExisting.pointId = pointId;
            const existing = await tx.inventory.findFirst({
                where: whereExisting
            });
            const updated = await tx.inventory.upsert({
                where: {
                    id: existing?.id || '00000000-0000-0000-0000-000000000000'
                },
                update: {
                    stock: { increment: stockToAdd },
                    threshold: threshold || 5,
                    isActive: true
                },
                create: {
                    userId: userId || null,
                    marketId: marketId || null,
                    pointId: pointId || null,
                    projectId,
                    itemName,
                    stock: stockToAdd,
                    threshold: threshold || 5,
                    isActive: true
                }
            });
            await tx.inventoryLog.create({
                data: {
                    inventoryId: updated.id,
                    addedStock: stockToAdd,
                    previousStock: existing ? existing.stock : 0,
                    newStock: existing ? existing.stock + stockToAdd : stockToAdd,
                    projectId
                }
            });
            return updated;
        });
        res.json({ success: true, inventory });
    }
    catch (error) {
        console.error('Error assigning stock:', error);
        res.status(500).json({ message: 'Error assigning stock', detail: error.message });
    }
};
exports.assignStock = assignStock;
const getInventoryLogs = async (req, res) => {
    try {
        const { id } = req.params; // inventoryId
        const logs = await db_1.default.inventoryLog.findMany({
            where: { inventoryId: id },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json(logs);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching inventory logs', detail: error.message });
    }
};
exports.getInventoryLogs = getInventoryLogs;
// 2.2 Redemption Rules (Lineamientos)
const getRules = async (req, res) => {
    try {
        const { projectId } = req.query;
        const rules = await db_1.default.redemptionRule.findMany({
            where: { projectId: projectId },
            orderBy: { minPurchase: 'asc' }
        });
        res.json(rules);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching rules', detail: error.message });
    }
};
exports.getRules = getRules;
const saveRule = async (req, res) => {
    try {
        const { id, projectId, minPurchase, maxPurchase, rewardName, type, productCriteria } = req.body;
        if (id) {
            const rule = await db_1.default.redemptionRule.update({
                where: { id },
                data: { minPurchase, maxPurchase, rewardName, type: type || 'BY_AMOUNT', productCriteria: productCriteria || {} }
            });
            return res.json({ success: true, rule });
        }
        const rule = await db_1.default.redemptionRule.create({
            data: { projectId, minPurchase, maxPurchase, rewardName, type: type || 'BY_AMOUNT', productCriteria: productCriteria || {} }
        });
        res.json({ success: true, rule });
    }
    catch (error) {
        res.status(500).json({ message: 'Error saving rule', detail: error.message });
    }
};
exports.saveRule = saveRule;
const createStaff = async (req, res) => {
    try {
        const { email, password, fullName, projectId, role } = req.body;
        // Validate project existence
        if (projectId) {
            const projectExists = await db_1.default.project.findUnique({ where: { id: projectId } });
            if (!projectExists) {
                return res.status(400).json({ message: 'El proyecto seleccionado no existe. Por favor, selecciona un proyecto válido.' });
            }
        }
        const passwordHash = await bcryptjs_1.default.hash(password || 'staff123', 10);
        const user = await db_1.default.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                projectId: projectId || null,
                role: role || 'STAFF'
            }
        });
        res.json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName } });
    }
    catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ message: 'Error creando staff', detail: error.message });
    }
};
exports.createStaff = createStaff;
// 3. Manage Points
const getPoints = async (req, res) => {
    try {
        const { projectId } = req.query;
        const whereClause = {};
        if (projectId && projectId !== 'undefined' && projectId !== 'null') {
            whereClause.projectId = projectId;
        }
        const points = await db_1.default.point.findMany({
            where: whereClause,
            orderBy: { name: 'asc' }
        });
        res.json(points);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching points', detail: error.message });
    }
};
exports.getPoints = getPoints;
const createPoint = async (req, res) => {
    try {
        const { name, address, projectId, ownerName, phone, marketId } = req.body;
        const point = await db_1.default.point.create({
            data: { name, address, projectId, ownerName, phone, marketId: marketId || null }
        });
        res.json({ success: true, point });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating point', detail: error.message });
    }
};
exports.createPoint = createPoint;
// 3.5 Markets CRUD
const getMarkets = async (req, res) => {
    try {
        const { projectId } = req.query;
        const markets = await db_1.default.market.findMany({
            where: { projectId: projectId },
            include: { points: { select: { id: true, name: true, ownerName: true, phone: true, userId: true } } },
            orderBy: { name: 'asc' }
        });
        res.json(markets);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching markets', detail: error.message });
    }
};
exports.getMarkets = getMarkets;
const createMarket = async (req, res) => {
    try {
        const { name, number, address, projectId } = req.body;
        // Generar código automático si no se envía
        const generatedNumber = number || `MK-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        const market = await db_1.default.market.create({
            data: { name, number: generatedNumber, address, projectId }
        });
        res.json({ success: true, market });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating market', detail: error.message });
    }
};
exports.createMarket = createMarket;
const deleteMarket = async (req, res) => {
    const { id } = req.params;
    try {
        // Primero desligar PDVs del mercado
        await db_1.default.point.updateMany({ where: { marketId: id }, data: { marketId: null } });
        await db_1.default.market.delete({ where: { id } });
        res.json({ success: true, message: 'Mercado eliminado' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar mercado', detail: err.message });
    }
};
exports.deleteMarket = deleteMarket;
const generatePdvAccess = async (req, res) => {
    try {
        const { id } = req.params; // Point ID
        const point = await db_1.default.point.findUnique({ where: { id } });
        if (!point)
            return res.status(404).json({ message: 'Punto no encontrado' });
        // Si ya tiene usuario asignado, no hacemos nada o lo retornamos
        if (point.userId) {
            return res.status(400).json({ message: 'Este punto ya tiene un acceso generado. No se puede crear múltiples cuentas para el mismo punto.' });
        }
        // Generar credenciales: El email será un DNI ficticio o el telefono@pdv.com, o pdv_[id]@domain.com.
        // Usaremos pdv_[shortid]@btl.com
        const shortId = point.id.substring(0, 6);
        const email = `pdv_${shortId}@canjes.com`;
        const plainPassword = Math.random().toString(36).substring(2, 8).toUpperCase();
        const passwordHash = await bcryptjs_1.default.hash(plainPassword, 10);
        const pdvUser = await db_1.default.user.create({
            data: {
                email,
                passwordHash,
                fullName: point.ownerName || point.name,
                projectId: point.projectId,
                role: 'PDV'
            }
        });
        const updatedPoint = await db_1.default.point.update({
            where: { id: point.id },
            data: { userId: pdvUser.id }
        });
        res.json({
            success: true,
            point: updatedPoint,
            credentials: { email, password: plainPassword }
        });
    }
    catch (err) {
        console.error('Error generando acceso PDV', err);
        res.status(500).json({ message: 'Error generando credenciales', detail: err.message });
    }
};
exports.generatePdvAccess = generatePdvAccess;
// 4. Update Project Config
const updateProjectConfig = async (req, res) => {
    try {
        const { projectId, name, clientName, logoUrl, config } = req.body;
        const project = await db_1.default.project.update({
            where: { id: projectId },
            data: {
                name,
                clientName,
                logoUrl: logoUrl || null,
                config: config || {}
            }
        });
        res.json({ success: true, project });
    }
    catch (error) {
        res.status(500).json({ message: 'Error updating project config', detail: error.message });
    }
};
exports.updateProjectConfig = updateProjectConfig;
const getProject = async (req, res) => {
    try {
        const { id } = req.params;
        const project = await db_1.default.project.findUnique({
            where: { id }
        });
        res.json(project);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching project', detail: error.message });
    }
};
exports.getProject = getProject;
// 5. Master Project List & Creation
const getProjects = async (req, res) => {
    try {
        const projects = await db_1.default.project.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(projects);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching projects', detail: error.message });
    }
};
exports.getProjects = getProjects;
const createProject = async (req, res) => {
    try {
        const { name, clientName } = req.body;
        const project = await db_1.default.project.create({
            data: {
                name,
                clientName,
                config: {
                    photo_slots: [
                        { label: 'Foto Boleta', key: 'ticket', required: true },
                        { label: 'Foto Producto', key: 'product', required: true }
                    ],
                    extra_fields: []
                }
            }
        });
        res.json({ success: true, project });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating project', detail: error.message });
    }
};
exports.createProject = createProject;
const getInventory = async (req, res) => {
    try {
        const { projectId, userId, marketId, pointId } = req.query;
        const whereClause = {
            projectId: projectId,
            isActive: true
        };
        if (userId)
            whereClause.userId = userId;
        if (marketId)
            whereClause.marketId = marketId;
        if (pointId)
            whereClause.pointId = pointId;
        const inventory = await db_1.default.inventory.findMany({
            where: whereClause,
            include: {
                user: { select: { fullName: true, email: true } },
                market: { select: { name: true } },
                point: { select: { name: true } }
            },
            orderBy: { itemName: 'asc' }
        });
        res.json(inventory);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching inventory', detail: error.message });
    }
};
exports.getInventory = getInventory;
// 11. Delete Project & Data
const deleteProject = async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.default.$transaction(async (tx) => {
            // Deletion order matters for FK constraints
            // 1. Vouchers primero (nueva tabla B2B2C)
            await tx.voucher.deleteMany({ where: { projectId: id } });
            // 2. Redemptions
            await tx.redemption.deleteMany({ where: { projectId: id } });
            // 3. Visits
            await tx.visit.deleteMany({
                where: {
                    OR: [
                        { user: { projectId: id } },
                        { point: { projectId: id } }
                    ]
                }
            });
            // 4. Resto
            await tx.dniHistory.deleteMany({ where: { projectId: id } });
            await tx.inventoryLog.deleteMany({ where: { inventory: { projectId: id } } });
            await tx.inventory.deleteMany({ where: { projectId: id } });
            await tx.redemptionRule.deleteMany({ where: { projectId: id } });
            // 5. Desligar userId de Points y limpiar marketId
            await tx.point.updateMany({ where: { projectId: id }, data: { userId: null, marketId: null } });
            await tx.user.deleteMany({ where: { projectId: id, role: { not: 'ADMIN' } } });
            await tx.point.deleteMany({ where: { projectId: id } });
            // 6. Mercados
            await tx.market.deleteMany({ where: { projectId: id } });
            // 7. Proyecto
            await tx.project.delete({ where: { id } });
        });
        res.json({ success: true, message: 'Proyecto y toda su data eliminados con éxito' });
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error al eliminar proyecto', detail: err.message });
    }
};
exports.deleteProject = deleteProject;
// 12. Management Deletions
const deleteStaff = async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.default.user.delete({ where: { id } });
        res.json({ success: true, message: 'Personal eliminado' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar personal', detail: err.message });
    }
};
exports.deleteStaff = deleteStaff;
const deletePoint = async (req, res) => {
    const { id } = req.params;
    try {
        // 1. Borrar vouchers del punto (B2B2C)
        await db_1.default.voucher.deleteMany({ where: { pointId: id } });
        // 2. Borrar redemptions de las visitas de este punto
        const visits = await db_1.default.visit.findMany({ where: { pointId: id }, select: { id: true } });
        const visitIds = visits.map((v) => v.id);
        if (visitIds.length) {
            await db_1.default.redemption.deleteMany({ where: { visitId: { in: visitIds } } });
        }
        // 3. Borrar visitas
        await db_1.default.visit.deleteMany({ where: { pointId: id } });
        // 4. Desligar usuario y mercado
        await db_1.default.point.update({ where: { id }, data: { userId: null, marketId: null } });
        // 5. Borrar el punto
        await db_1.default.point.delete({ where: { id } });
        res.json({ success: true, message: 'Punto eliminado' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar punto', detail: err.message });
    }
};
exports.deletePoint = deletePoint;
const updatePoint = async (req, res) => {
    const { id } = req.params;
    const { marketId } = req.body;
    try {
        const point = await db_1.default.point.update({
            where: { id },
            data: { marketId: marketId || null }
        });
        res.json({ success: true, point });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al actualizar punto', detail: err.message });
    }
};
exports.updatePoint = updatePoint;
const deleteRule = async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.default.redemptionRule.delete({ where: { id } });
        res.json({ success: true, message: 'Regla eliminada' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar regla', detail: err.message });
    }
};
exports.deleteRule = deleteRule;
const deactivateInventory = async (req, res) => {
    const { id } = req.params;
    try {
        await db_1.default.inventory.update({
            where: { id },
            data: { isActive: false }
        });
        res.json({ success: true, message: 'Producto desactivado con éxito' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al desactivar producto', detail: err.message });
    }
};
exports.deactivateInventory = deactivateInventory;
// 13. Redemptions (Admin)
const getAdminRedemptions = async (req, res) => {
    try {
        const { projectId } = req.query;
        const redemptions = await db_1.default.redemption.findMany({
            where: { projectId: projectId },
            orderBy: { createdAt: 'desc' },
            include: {
                visit: {
                    include: {
                        user: { select: { fullName: true, email: true } },
                        point: { select: { name: true } }
                    }
                }
            }
        });
        res.json(redemptions);
    }
    catch (error) {
        res.status(500).json({ message: 'Error fetching redemptions', detail: error.message });
    }
};
exports.getAdminRedemptions = getAdminRedemptions;
const updateRedemption = async (req, res) => {
    const { id } = req.params;
    const { amount, ticketNo, reward, extraData } = req.body;
    try {
        // Si quisieras cambiar el stock al editar el 'reward', la lógica iría aquí. 
        // Por simplicidad, este editor permite corregir errores de tipeo.
        const updated = await db_1.default.redemption.update({
            where: { id },
            data: {
                amount,
                ticketNo,
                reward,
                extraData
            }
        });
        res.json({ success: true, redemption: updated });
    }
    catch (error) {
        res.status(500).json({ error: 'Error al editar canje', detail: error.message });
    }
};
exports.updateRedemption = updateRedemption;
const deleteRedemption = async (req, res) => {
    const { id } = req.params;
    console.log(`[DELETE] Request for ID: ${id}`);
    try {
        const redemption = await db_1.default.redemption.findUnique({
            where: { id },
            include: { visit: true }
        });
        if (!redemption) {
            console.warn(`[DELETE] Item not found: ${id}`);
            return res.status(404).json({ message: 'Canje no encontrado' });
        }
        console.log(`[DELETE] Found redemption for DNI: ${redemption.dni}`);
        // Devolver stock si era un premio y no uno "Promocional" estático
        if (redemption.reward && redemption.reward !== 'Promocional' && redemption.projectId) {
            console.log(`[DELETE] Restoring stock for: ${redemption.reward}`);
            await db_1.default.inventory.updateMany({
                where: {
                    userId: redemption.visit.userId,
                    projectId: redemption.projectId,
                    itemName: redemption.reward
                },
                data: {
                    stock: { increment: 1 }
                }
            });
            console.log(`[DELETE] Stock restored successfully.`);
        }
        console.log(`[DELETE] Removing record from database...`);
        await db_1.default.redemption.delete({ where: { id } });
        console.log(`[DELETE] Database record removed.`);
        res.json({ success: true, message: 'Canje eliminado y stock restaurado' });
    }
    catch (error) {
        console.error('[DELETE ERROR]:', error);
        res.status(500).json({ error: 'Error al borrar canje', detail: error.message });
    }
};
exports.deleteRedemption = deleteRedemption;
// 14. Visits (Admin Check-Ins)
const getAdminVisits = async (req, res) => {
    try {
        const { projectId } = req.query;
        // We only fetch visits where the user making the visit belongs to the projectId 
        // or the point belongs to it. Since user.projectId maps mostly, let's filter by user project
        // or point project. The safest is getting by point.projectId or user.projectId.
        // In our schema, point has projectId.
        const visits = await db_1.default.visit.findMany({
            where: {
                point: {
                    projectId: projectId
                }
            },
            include: {
                user: { select: { fullName: true } },
                point: { select: { name: true } },
                redemptions: { select: { reward: true } }
            },
            orderBy: { startTime: 'desc' }
        });
        res.json(visits);
    }
    catch (error) {
        console.error('Error fetching admin visits:', error);
        res.status(500).json({ message: 'Error fetching visits', detail: error.message });
    }
};
exports.getAdminVisits = getAdminVisits;
