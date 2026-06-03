import { Router } from 'express';
import { 
  resetData, 
  getStaff, 
  createStaff, 
  deleteStaff,
  getPoints, 
  createPoint, 
  updatePoint,
  deletePoint,
  generatePdvAccess,
  getMarkets,
  createMarket,
  deleteMarket,
  updateProjectConfig,
  getProjects,
  getProject,
  createProject,
  deleteProject,
  getInventory,
  assignStock,
  getInventoryLogs,
  deactivateInventory,
  getRules,
  saveRule,
  deleteRule,
  getAdminRedemptions,
  updateRedemption,
  deleteRedemption,
  getAdminVisits
} from '../controllers/admin.controller';

const router = Router();

// Staff management
router.get('/staff', getStaff);
router.post('/staff', createStaff);
router.delete('/staff/:id', deleteStaff);

// Points management
router.get('/points', getPoints);
router.post('/points', createPoint);
router.patch('/points/:id', updatePoint);
router.delete('/points/:id', deletePoint);
router.post('/points/:id/access', generatePdvAccess);

// Markets management
router.get('/markets', getMarkets);
router.post('/markets', createMarket);
router.delete('/markets/:id', deleteMarket);

// Project management & Reset
router.post('/project/config', updateProjectConfig);
router.post('/reset', resetData);

// Multi-project master management
router.get('/projects', getProjects);
router.get('/projects/:id', getProject);
router.post('/projects', createProject);
router.delete('/projects/:id', deleteProject);

// Inventory monitoring
router.get('/inventory', getInventory);
router.post('/inventory/assign', assignStock);
router.get('/inventory/:id/logs', getInventoryLogs);
router.delete('/inventory/:id', deactivateInventory);

// Redemption Rules
router.get('/rules', getRules);
router.post('/rules', saveRule);
router.delete('/rules/:id', deleteRule);

// Redemptions Management (Admin)
router.get('/redemptions', getAdminRedemptions);
router.put('/redemptions/:id', updateRedemption);
router.delete('/redemptions/:id', deleteRedemption);

// Check-Ins & Visits
router.get('/visits', getAdminVisits);

export default router;
