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
exports.ConfigService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ConfigService = class ConfigService {
    constructor(conn) {
        this.conn = conn;
    }
    async getClientConfig() {
        const featureFlags = Object.fromEntries([
            ['telehealth', process.env.FEATURE_TELEHEALTH],
            ['home_visit', process.env.FEATURE_HOME_VISIT],
            ['insurance_integration', process.env.FEATURE_INSURANCE],
            ['whatsapp_notifications', process.env.FEATURE_WHATSAPP],
            ['loyalty_rewards', process.env.FEATURE_LOYALTY],
            ['ai_symptom_checker', process.env.FEATURE_AI_SYMPTOM],
        ].flatMap(([key, value]) => value === undefined ? [] : [[key, value === 'true']]));
        const featureRollouts = {};
        try {
            const rows = await this.conn.collection('feature_flags').find({}).project({ _id: 0, key: 1, enabled: 1, rollout_percentage: 1 }).toArray();
            for (const row of rows) {
                const key = String(row.key || '').trim();
                if (!key)
                    continue;
                featureFlags[key] = !!row.enabled;
                featureRollouts[key] = Math.max(0, Math.min(100, Number(row.rollout_percentage ?? 100)));
            }
        }
        catch {
        }
        const numberFromEnv = (value) => {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? parsed : undefined;
        };
        const pricing = Object.fromEntries([
            ['vat_percentage', numberFromEnv(process.env.VAT_PERCENTAGE)],
            ['delivery_base_fee', numberFromEnv(process.env.DELIVERY_BASE_FEE)],
        ].filter(([, value]) => value !== undefined));
        const contact = Object.fromEntries([
            ['support_phone', process.env.SUPPORT_PHONE],
            ['support_email', process.env.SUPPORT_EMAIL],
        ].filter(([, value]) => Boolean(value)));
        return {
            version: process.env.APP_VERSION || null,
            features: featureFlags,
            feature_rollouts: featureRollouts,
            pricing,
            contact,
        };
    }
};
exports.ConfigService = ConfigService;
exports.ConfigService = ConfigService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], ConfigService);
//# sourceMappingURL=config.service.js.map