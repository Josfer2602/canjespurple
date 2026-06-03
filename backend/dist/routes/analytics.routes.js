"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const router = (0, express_1.Router)();
router.get('/stats', analytics_controller_1.getStats);
router.get('/geo-visits', analytics_controller_1.getGeoVisits);
router.get('/recent', analytics_controller_1.getRecentRedemptions);
exports.default = router;
