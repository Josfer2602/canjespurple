import { Request, Response } from 'express';
import prisma from '../config/db';

// Helper to build date filter from query params
function buildDateFilter(dateFrom?: string, dateTo?: string) {
  const filter: any = {};
  if (dateFrom) filter.gte = new Date(dateFrom + 'T00:00:00');
  if (dateTo)   filter.lte = new Date(dateTo + 'T23:59:59');
  return Object.keys(filter).length ? filter : undefined;
}

function buildVisitRelationsFilter(reqQuery: any) {
  const { marketId, pointId, userId } = reqQuery;
  const filter: any = {};
  
  if (userId) filter.userId = userId as string;
  if (pointId) filter.pointId = pointId as string;
  else if (marketId) filter.point = { marketId: marketId as string };
  
  return Object.keys(filter).length ? filter : undefined;
}

function buildRedemptionRelationsFilter(reqQuery: any) {
  const visitFilter = buildVisitRelationsFilter(reqQuery);
  return visitFilter ? { visit: visitFilter } : undefined;
}

export const getStats = async (req: Request, res: Response) => {
  try {
    const { projectId, dateFrom, dateTo } = req.query;
    const dateFilter = buildDateFilter(dateFrom as string, dateTo as string);

    const projectFilter = projectId ? { projectId: projectId as string } : {};
    const redemptionWhere = {
      ...projectFilter,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...buildRedemptionRelationsFilter(req.query)
    };
    const visitWhere = {
      ...(projectId ? { user: { projectId: projectId as string } } : {}),
      ...(dateFilter ? { startTime: dateFilter } : {}),
      ...buildVisitRelationsFilter(req.query)
    };

    const [totalVisits, activeVisits, totalRedemptions, stats] = await Promise.all([
      prisma.visit.count({ where: visitWhere }),
      prisma.visit.count({ where: { ...visitWhere, isActive: true } }),
      prisma.redemption.count({ where: redemptionWhere }),
      prisma.redemption.aggregate({ _sum: { amount: true }, where: redemptionWhere })
    ]);

    res.json({
      totalVisits,
      activeVisits,
      totalRedemptions,
      totalPurchase: stats._sum.amount ? Number(stats._sum.amount) : 0
    });
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener estadísticas', error: error.message });
  }
};

export const getKpis = async (req: Request, res: Response) => {
  try {
    const { projectId, dateFrom, dateTo } = req.query;
    const dateFilter = buildDateFilter(dateFrom as string, dateTo as string);

    const projectFilter = projectId ? { projectId: projectId as string } : {};
    const redemptionWhere = {
      ...projectFilter,
      ...(dateFilter ? { createdAt: dateFilter } : {}),
      ...buildRedemptionRelationsFilter(req.query)
    };

    // Today boundaries
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayWhere = {
      ...projectFilter,
      createdAt: { gte: todayStart, lte: todayEnd },
      ...buildRedemptionRelationsFilter(req.query)
    };

    const visitWhere = {
      ...(projectId ? { user: { projectId: projectId as string } } : {}),
      ...(dateFilter ? { startTime: dateFilter } : {}),
      ...buildVisitRelationsFilter(req.query)
    };
    const visitTodayWhere = {
      ...(projectId ? { user: { projectId: projectId as string } } : {}),
      startTime: { gte: todayStart, lte: todayEnd },
      ...buildVisitRelationsFilter(req.query)
    };

    // Fetch all in parallel
    const [
      redemptions,
      todayCount,
      totalVisits,
      todayVisits,
      staffActive,
      inventory
    ] = await Promise.all([
      prisma.redemption.findMany({
        where: redemptionWhere,
        include: { visit: { include: { point: true, market: true } } }
      }),
      prisma.redemption.count({ where: todayWhere }),
      prisma.visit.count({ where: visitWhere }),
      prisma.visit.count({ where: visitTodayWhere }),
      prisma.visit.count({ where: { ...(projectId ? { user: { projectId: projectId as string } } : {}), isActive: true } }),
      prisma.inventory.aggregate({ _sum: { stock: true }, where: projectFilter })
    ]);

    // Unique DNIs
    const uniqueDnis = new Set((redemptions as any[]).map((r: any) => r.dni)).size;

    // Conversion rate
    const conversionRate = totalVisits > 0
      ? ((redemptions.length / totalVisits) * 100).toFixed(1)
      : '0';

    // Top point by redemption count
    const pointCount: Record<string, number> = {};
    (redemptions as any[]).forEach((r: any) => {
      const name = r.visit?.point?.name || r.visit?.market?.name || 'N/A';
      pointCount[name] = (pointCount[name] || 0) + 1;
    });
    const topPoint = Object.entries(pointCount).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
    const topPointCount = Object.entries(pointCount).sort((a, b) => b[1] - a[1])[0]?.[1] || 0;

    // Avg ticket per point
    const pointAmounts: Record<string, { total: number; count: number }> = {};
    (redemptions as any[]).forEach((r: any) => {
      const name = r.visit?.point?.name || r.visit?.market?.name || 'N/A';
      if (!pointAmounts[name]) pointAmounts[name] = { total: 0, count: 0 };
      pointAmounts[name].total += Number(r.amount || 0);
      pointAmounts[name].count += 1;
    });

    const topPoints = Object.entries(pointAmounts)
      .map(([name, data]) => ({
        name,
        count: data.count,
        total: data.total,
        avg: data.count > 0 ? (data.total / data.count).toFixed(2) : '0'
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const totalRedemptions = redemptions.length;
    const totalAmount = (redemptions as any[]).reduce((acc, r) => acc + Number(r.amount || 0), 0);
    const avgTicket = totalRedemptions > 0 ? totalAmount / totalRedemptions : 0;
    const pendingStock = inventory._sum.stock || 0;

    res.json({
      uniqueDnis,
      todayCount,
      todayRedemptions: todayCount,
      todayVisits,
      staffActive,
      conversionRate: parseFloat(conversionRate),
      topPoint,
      topPointName: topPoint,
      topPointCount,
      topPoints,
      totalRedemptions,
      totalAmount,
      avgTicket,
      pendingStock
    });
  } catch (error: any) {
    console.error('Error KPIs:', error);
    res.status(500).json({ message: 'Error al obtener KPIs', error: error.message });
  }
};

export const getGeoVisits = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.query;
    const projectFilter = projectId ? `AND r."projectId" = '${projectId}'` : '';
    
    const visits: any[] = await prisma.$queryRawUnsafe(`
      SELECT 
        r.id, r."visitId",
        COALESCE(p.name, 'Ubicación Staff') as "pointName",
        v."facadePhoto",
        ST_X(r.location::geometry) as lng, 
        ST_Y(r.location::geometry) as lat,
        r."createdAt" as "startTime"
      FROM "Redemption" r
      LEFT JOIN "Visit" v ON r."visitId" = v.id
      LEFT JOIN "Point" p ON v."pointId" = p.id
      WHERE r.location IS NOT NULL ${projectFilter}
      ORDER BY r."createdAt" DESC
      LIMIT 100
    `);

    res.json(visits);
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener geolocalización', error: error.message });
  }
};

export const getRecentRedemptions = async (req: Request, res: Response) => {
  try {
    const { projectId, dateFrom, dateTo } = req.query;
    const dateFilter = buildDateFilter(dateFrom as string, dateTo as string);

    const redemptions = await prisma.redemption.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: {
        ...(projectId ? { projectId: projectId as string } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...buildRedemptionRelationsFilter(req.query)
      },
      include: {
        visit: {
          include: {
            user: { select: { fullName: true } },
            point: { select: { name: true } },
            market: { select: { name: true } }
          }
        }
      }
    });

    const formatted = redemptions.map(r => ({
      id: r.id,
      point: { name: r.visit?.point?.name || r.visit?.market?.name || 'Desconocido' },
      user: { fullName: r.visit?.user?.fullName || 'Desconocido' },
      purchaseAmount: Number(r.amount),
      reward: r.reward,
      createdAt: r.createdAt
    }));

    res.json(formatted);
  } catch (error: any) {
    res.status(500).json({ message: 'Error al obtener redenciones recientes', error: error.message });
  }
};

export const getPerformance = async (req: Request, res: Response) => {
  try {
    const { projectId, dateFrom, dateTo } = req.query;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const dateFilter = buildDateFilter(dateFrom as string, dateTo as string);

    const redemptions = await prisma.redemption.findMany({
      where: { 
        ...(projectId ? { projectId: projectId as string } : {}),
        createdAt: dateFilter || { gte: sevenDaysAgo },
        ...buildRedemptionRelationsFilter(req.query)
      },
      select: { createdAt: true, amount: true }
    });

    const days = ['Dom', 'Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab'];
    const orderedChart = [];
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      const key = d.toISOString().split('T')[0];
      
      const dayRedemptions = redemptions.filter(r => r.createdAt.toISOString().split('T')[0] === key);
      
      orderedChart.push({
        name: dayName,
        visits: dayRedemptions.length,
        sales: dayRedemptions.reduce((acc, r) => acc + Number(r.amount), 0),
        total: dayRedemptions.reduce((acc, r) => acc + Number(r.amount), 0)
      });
    }
    
    res.json(orderedChart);
  } catch (error: any) {
    res.status(500).json({ message: 'Error de performance', error: error.message });
  }
};

export const getBreakdown = async (req: Request, res: Response) => {
  try {
    const { projectId, dateFrom, dateTo } = req.query;
    const dateFilter = buildDateFilter(dateFrom as string, dateTo as string);
    
    const redemptions = await prisma.redemption.findMany({
      where: {
        ...(projectId ? { projectId: projectId as string } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...buildRedemptionRelationsFilter(req.query)
      },
      include: { visit: { include: { point: true, market: true } } }
    });

    const pointsCount: Record<string, number> = {};
    const rewardsCount: Record<string, number> = {};

    redemptions.forEach(r => {
      const pName = r.visit?.point?.name || r.visit?.market?.name || 'Desconocido';
      pointsCount[pName] = (pointsCount[pName] || 0) + 1;
      const reward = r.reward || 'Sin Premio';
      rewardsCount[reward] = (rewardsCount[reward] || 0) + 1;
    });

    const topPoints = Object.keys(pointsCount)
      .map(name => ({ name, value: pointsCount[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    const topRewards = Object.keys(rewardsCount)
      .map(name => ({ name, value: rewardsCount[name] }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    res.json({ topPoints, topRewards });
  } catch (error: any) {
    res.status(500).json({ message: 'Error breakdown', error: error.message });
  }
};

export const getHeatmap = async (req: Request, res: Response) => {
  try {
    const { projectId, dateFrom, dateTo } = req.query;
    const dateFilter = buildDateFilter(dateFrom as string, dateTo as string);
    
    const redemptions = await prisma.redemption.findMany({
      where: {
        ...(projectId ? { projectId: projectId as string } : {}),
        ...(dateFilter ? { createdAt: dateFilter } : {}),
        ...buildRedemptionRelationsFilter(req.query)
      },
      select: { createdAt: true }
    });

    const countMap: Record<string, number> = {};
    let maxCount = 0;
    
    redemptions.forEach(r => {
      const local = new Date(r.createdAt);
      const day = local.getDay();
      const hour = local.getHours();
      const key = `${day}-${hour}`;
      countMap[key] = (countMap[key] || 0) + 1;
      if (countMap[key] > maxCount) maxCount = countMap[key];
    });

    const matrix: any[] = [];
    for (let day = 0; day <= 6; day++) {
      for (let hour = 0; hour <= 23; hour++) {
        matrix.push({ day, hour, count: countMap[`${day}-${hour}`] || 0 });
      }
    }
    
    res.json({ matrix, maxCount });
  } catch (err: any) {
    res.status(500).json({ message: 'Error heatmap', error: err.message });
  }
};
