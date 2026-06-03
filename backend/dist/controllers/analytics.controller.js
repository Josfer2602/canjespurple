"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecentRedemptions = exports.getGeoVisits = exports.getStats = void 0;
const db_1 = __importDefault(require("../config/db"));
const getStats = async (req, res) => {
    try {
        const totalVisits = await db_1.default.visit.count();
        const activeVisits = await db_1.default.visit.count({ where: { isActive: true } });
        const totalRedemptions = await db_1.default.redemption.count();
        const stats = await db_1.default.redemption.aggregate({
            _sum: {
                amount: true
            }
        });
        res.json({
            totalVisits,
            activeVisits,
            totalRedemptions,
            totalPurchase: stats._sum.amount ? Number(stats._sum.amount) : 0
        });
    }
    catch (error) {
        res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
    }
};
exports.getStats = getStats;
const getGeoVisits = async (req, res) => {
    try {
        const visits = await db_1.default.$queryRaw `
      SELECT 
        v.id, 
        v."pointId", 
        p.name as "pointName",
        v."facadePhoto",
        ST_X(v.location::geometry) as lng, 
        ST_Y(v.location::geometry) as lat,
        v."startTime"
      FROM "Visit" v
      JOIN "Point" p ON v."pointId" = p.id
      WHERE v.location IS NOT NULL
      ORDER BY v."startTime" DESC
      LIMIT 100
    `;
        res.json(visits);
    }
    catch (error) {
        res.status(500).json({ message: 'Error al obtener geolocalización', error: error.message });
    }
};
exports.getGeoVisits = getGeoVisits;
const getRecentRedemptions = async (req, res) => {
    try {
        const redemptions = await db_1.default.redemption.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: {
                visit: {
                    include: {
                        user: { select: { fullName: true } },
                        point: { select: { name: true } }
                    }
                }
            }
        });
        // Formateamos para el frontend
        const formatted = redemptions.map(r => ({
            id: r.id,
            point: { name: r.visit.point.name },
            user: { fullName: r.visit.user.fullName },
            purchaseAmount: Number(r.amount),
            createdAt: r.createdAt
        }));
        res.json(formatted);
    }
    catch (error) {
        res.status(500).json({ message: 'Error al obtener redenciones recientes', error: error.message });
    }
};
exports.getRecentRedemptions = getRecentRedemptions;
