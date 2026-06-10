"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_routes_1 = __importDefault(require("./routes/auth.routes"));
const redemption_routes_1 = __importDefault(require("./routes/redemption.routes"));
const visit_routes_1 = __importDefault(require("./routes/visit.routes"));
const analytics_routes_1 = __importDefault(require("./routes/analytics.routes"));
const admin_routes_1 = __importDefault(require("./routes/admin.routes"));
const voucher_routes_1 = __importDefault(require("./routes/voucher.routes"));
const import_routes_1 = __importDefault(require("./routes/import.routes"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 4000;
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://127.0.0.1:5173', 'http://127.0.0.1:5174', 'http://192.168.101.12:5173', process.env.FRONTEND_URL || 'https://canjes.simplegoapp.de'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express_1.default.json({ limit: '50mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '50mb' }));
// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});
// Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/redemptions', redemption_routes_1.default);
app.use('/api/visits', visit_routes_1.default);
app.use('/api/analytics', analytics_routes_1.default);
app.use('/api/admin', admin_routes_1.default);
app.use('/api/vouchers', voucher_routes_1.default);
app.use('/api/import', import_routes_1.default);
// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'BTL SaaS API'
    });
});
// Start Server
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`🚀 Server listening on port ${PORT} (including local network)`);
});
exports.default = app;
