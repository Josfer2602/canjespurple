"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const redemption_controller_1 = require("../controllers/redemption.controller");
const router = (0, express_1.Router)();
router.post('/', redemption_controller_1.createRedemption);
router.get('/history', redemption_controller_1.getHistory);
router.get('/check-dni', redemption_controller_1.checkDniLimit);
exports.default = router;
