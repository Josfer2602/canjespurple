"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const visit_controller_1 = require("../controllers/visit.controller");
const router = (0, express_1.Router)();
router.get('/get-active', visit_controller_1.getActiveVisit);
router.post('/start', visit_controller_1.startVisit);
router.post('/end', visit_controller_1.endVisit);
exports.default = router;
