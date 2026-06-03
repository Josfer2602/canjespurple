"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteRedemption = exports.updateRedemption = exports.getAdminRedemptions = exports.deactivateInventory = exports.deleteRule = exports.deletePoint = exports.deleteStaff = exports.deleteProject = exports.getInventory = exports.createProject = exports.getProjects = exports.getProject = exports.updateProjectConfig = exports.createPoint = exports.getPoints = exports.createStaff = exports.saveRule = exports.getRules = exports.assignStock = exports.getStaff = exports.resetData = void 0;
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
                projectId: projectId,
                role: { in: ['STAFF', 'SUPERVISOR'] }
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
        const { userId, projectId, itemName, stockToAdd, threshold } = req.body;
        if (!userId || !projectId || !itemName) {
            return res.status(400).json({ message: 'UserId, ProjectId e ItemName son obligatorios' });
        }
        // Buscamos si ya existe el registro (activo o inactivo) para este canjista y producto
        const existing = await db_1.default.inventory.findFirst({
            where: { userId, projectId, itemName }
        });
        const inventory = await db_1.default.inventory.upsert({
            where: {
                id: existing?.id || '00000000-0000-0000-0000-000000000000'
            },
            update: {
                stock: { increment: stockToAdd },
                threshold: threshold || 5,
                isActive: true // Reactivamos si estaba desactivado
            },
            create: {
                userId,
                projectId,
                itemName,
                stock: stockToAdd,
                threshold: threshold || 5,
                isActive: true
            }
        });
        res.json({ success: true, inventory });
    }
    catch (error) {
        console.error('Error assigning stock:', error);
        res.status(500).json({ message: 'Error assigning stock', detail: error.message });
    }
};
exports.assignStock = assignStock;
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
        const { id, projectId, minPurchase, maxPurchase, rewardName } = req.body;
        if (id) {
            const rule = await db_1.default.redemptionRule.update({
                where: { id },
                data: { minPurchase, maxPurchase, rewardName }
            });
            return res.json({ success: true, rule });
        }
        const rule = await db_1.default.redemptionRule.create({
            data: { projectId, minPurchase, maxPurchase, rewardName }
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
        const passwordHash = await bcryptjs_1.default.hash(password || 'staff123', 10);
        const user = await db_1.default.user.create({
            data: {
                email,
                passwordHash,
                fullName,
                projectId,
                role: role || 'STAFF'
            }
        });
        res.json({ success: true, user: { id: user.id, email: user.email, fullName: user.fullName } });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating staff', detail: error.message });
    }
};
exports.createStaff = createStaff;
// 3. Manage Points
const getPoints = async (req, res) => {
    try {
        const { projectId } = req.query;
        const points = await db_1.default.point.findMany({
            where: { projectId: projectId },
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
        const { name, address, projectId } = req.body;
        const point = await db_1.default.point.create({
            data: { name, address, projectId }
        });
        res.json({ success: true, point });
    }
    catch (error) {
        res.status(500).json({ message: 'Error creating point', detail: error.message });
    }
};
exports.createPoint = createPoint;
// 4. Update Project Config
const updateProjectConfig = async (req, res) => {
    try {
        const { projectId, name, clientName, config } = req.body;
        const project = await db_1.default.project.update({
            where: { id: projectId },
            data: {
                name,
                clientName,
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
        const { projectId, userId } = req.query;
        const whereClause = {
            projectId: projectId,
            isActive: true
        };
        if (userId) {
            whereClause.userId = userId;
        }
        const inventory = await db_1.default.inventory.findMany({
            where: whereClause,
            include: {
                user: {
                    select: { fullName: true, email: true }
                }
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
            await tx.redemption.deleteMany({ where: { projectId: id } });
            await tx.visit.deleteMany({
                where: {
                    OR: [
                        { user: { projectId: id } },
                        { point: { projectId: id } }
                    ]
                }
            });
            await tx.dniHistory.deleteMany({ where: { projectId: id } });
            await tx.inventory.deleteMany({ where: { projectId: id } });
            await tx.redemptionRule.deleteMany({ where: { projectId: id } });
            await tx.point.deleteMany({ where: { projectId: id } });
            await tx.user.deleteMany({ where: { projectId: id } });
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
        await db_1.default.point.delete({ where: { id } });
        res.json({ success: true, message: 'Punto eliminado' });
    }
    catch (err) {
        res.status(500).json({ error: 'Error al eliminar punto', detail: err.message });
    }
};
exports.deletePoint = deletePoint;
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
    try {
        const redemption = await db_1.default.redemption.findUnique({
            where: { id },
            include: { visit: true }
        });
        if (!redemption) {
            return res.status(404).json({ message: 'Canje no encontrado' });
        }
        await db_1.default.$transaction(async (tx) => {
            // Devolver stock si era un premio y no uno "Promocional" estático
            if (redemption.reward && redemption.reward !== 'Promocional' && redemption.projectId) {
                await tx.inventory.updateMany({
                    where: {
                        userId: redemption.visit.userId,
                        projectId: redemption.projectId,
                        itemName: redemption.reward
                    },
                    data: {
                        stock: { increment: 1 }
                    }
                });
            }
            await tx.redemption.delete({ where: { id } });
        });
        res.json({ success: true, message: 'Canje eliminado y stock restaurado' });
    }
    catch (error) {
        console.error('Error deleting redemption:', error);
        res.status(500).json({ error: 'Error al borrar canje', detail: error.message });
    }
};
exports.deleteRedemption = deleteRedemption;
