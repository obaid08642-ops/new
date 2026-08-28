"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeoEngineService = void 0;
const common_1 = require("@nestjs/common");
let GeoEngineService = class GeoEngineService {
    distanceKm(a, b) {
        if (!a || !b || typeof a.lat !== 'number' || typeof b.lat !== 'number')
            return Number.POSITIVE_INFINITY;
        const toRad = (d) => (d * Math.PI) / 180;
        const R = 6371;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const sa = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
        return 2 * R * Math.asin(Math.min(1, Math.sqrt(sa)));
    }
    withinRadius(center, point, radius_km) {
        return this.distanceKm(center, point) <= radius_km;
    }
    pointInPolygon(point, polygon) {
        if (!polygon || polygon.length < 3)
            return false;
        let inside = false;
        const x = point.lng, y = point.lat;
        for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
            const xi = polygon[i].lng, yi = polygon[i].lat;
            const xj = polygon[j].lng, yj = polygon[j].lat;
            const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi || 1e-12) + xi;
            if (intersect)
                inside = !inside;
        }
        return inside;
    }
    matchZone(point, zones) {
        for (const z of zones || []) {
            if (!z.active)
                continue;
            if (z.shape === 'circle' && z.center && this.withinRadius(z.center, point, z.radius_km || 0))
                return z;
            if (z.shape === 'polygon' && z.polygon && this.pointInPolygon(point, z.polygon))
                return z;
        }
        return null;
    }
};
exports.GeoEngineService = GeoEngineService;
exports.GeoEngineService = GeoEngineService = __decorate([
    (0, common_1.Injectable)()
], GeoEngineService);
//# sourceMappingURL=geo-engine.service.js.map