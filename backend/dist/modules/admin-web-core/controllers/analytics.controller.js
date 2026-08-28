"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const heatmap_data_schema_1 = require("../schemas/heatmap-data.schema");
const GRID = 0.05;
let AnalyticsController = class AnalyticsController {
    constructor(heatmapModel, emergencyModel, appointmentModel) {
        this.heatmapModel = heatmapModel;
        this.emergencyModel = emergencyModel;
        this.appointmentModel = appointmentModel;
    }
    addPoint(cells, lat, lng, type) {
        const la = Number(lat), ln = Number(lng);
        if (!isFinite(la) || !isFinite(ln) || (la === 0 && ln === 0))
            return;
        const key = `${Math.round(la / GRID)}:${Math.round(ln / GRID)}:${type}`;
        const cell = cells.get(key) || {
            clusterId: key,
            latitude: Math.round(la / GRID) * GRID,
            longitude: Math.round(ln / GRID) * GRID,
            intensity: 0,
            type,
        };
        cell.intensity += 1;
        cells.set(key, cell);
    }
    async getHeatmaps() {
        const cells = new Map();
        try {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const sos = await this.emergencyModel
                .find({ createdAt: { $gte: since }, 'location.lat': { $exists: true } }, { location: 1 })
                .lean();
            for (const s of sos)
                this.addPoint(cells, s.location?.lat, s.location?.lng, 'home_care');
        }
        catch { }
        try {
            const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
            const appts = await this.appointmentModel
                .find({ createdAt: { $gte: since }, 'visit_location.lat': { $exists: true } }, { visit_location: 1 })
                .lean();
            for (const a of appts)
                this.addPoint(cells, a.visit_location?.lat, a.visit_location?.lng, 'home_care');
        }
        catch { }
        const data = [...cells.values()].sort((a, b) => b.intensity - a.intensity).slice(0, 200);
        return { data, source: 'live', generated_at: new Date().toISOString() };
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('heatmaps'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getHeatmaps", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, common_1.Controller)('nabd-extensions/admin/analytics'),
    __param(0, (0, mongoose_1.InjectModel)(heatmap_data_schema_1.HeatmapData.name)),
    __param(1, (0, mongoose_1.InjectModel)('EmergencyRequest')),
    __param(2, (0, mongoose_1.InjectModel)('Appointment')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map