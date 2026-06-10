"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const router = (0, express_1.Router)();
// Staff management
router.get('/staff', admin_controller_1.getStaff);
router.post('/staff', admin_controller_1.createStaff);
router.delete('/staff/:id', admin_controller_1.deleteStaff);
// Points management
router.get('/points', admin_controller_1.getPoints);
router.post('/points', admin_controller_1.createPoint);
router.patch('/points/:id', admin_controller_1.updatePoint);
router.delete('/points/:id', admin_controller_1.deletePoint);
router.post('/points/:id/access', admin_controller_1.generatePdvAccess);
// Markets management
router.get('/markets', admin_controller_1.getMarkets);
router.post('/markets', admin_controller_1.createMarket);
router.put('/markets/:id', admin_controller_1.updateMarket);
router.delete('/markets/:id', admin_controller_1.deleteMarket);
// Project management & Reset
router.post('/project/config', admin_controller_1.updateProjectConfig);
router.post('/reset', admin_controller_1.resetData);
// Multi-project master management
router.get('/projects', admin_controller_1.getProjects);
router.get('/projects/:id', admin_controller_1.getProject);
router.post('/projects', admin_controller_1.createProject);
router.delete('/projects/:id', admin_controller_1.deleteProject);
// Inventory monitoring
router.get('/inventory', admin_controller_1.getInventory);
router.post('/inventory/assign', admin_controller_1.assignStock);
router.get('/inventory/:id/logs', admin_controller_1.getInventoryLogs);
router.delete('/inventory/:id', admin_controller_1.deactivateInventory);
// Redemption Rules
router.get('/rules', admin_controller_1.getRules);
router.post('/rules', admin_controller_1.saveRule);
router.delete('/rules/:id', admin_controller_1.deleteRule);
// Redemptions Management (Admin)
router.get('/redemptions', admin_controller_1.getAdminRedemptions);
router.put('/redemptions/:id', admin_controller_1.updateRedemption);
router.delete('/redemptions/:id', admin_controller_1.deleteRedemption);
router.post('/redemptions/:id/approve', admin_controller_1.approveRedemption);
router.post('/redemptions/:id/reject', admin_controller_1.rejectRedemption);
// Check-Ins & Visits
router.get('/visits', admin_controller_1.getAdminVisits);
exports.default = router;
