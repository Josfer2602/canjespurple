import { Router } from 'express';
import { 
  getStats,
  getKpis,
  getGeoVisits, 
  getRecentRedemptions,
  getPerformance,
  getBreakdown,
  getHeatmap
} from '../controllers/analytics.controller';

const router = Router();

router.get('/stats', getStats);
router.get('/kpis', getKpis);
router.get('/geo-visits', getGeoVisits);
router.get('/recent', getRecentRedemptions);
router.get('/performance', getPerformance);
router.get('/breakdown', getBreakdown);
router.get('/heatmap', getHeatmap);

export default router;
