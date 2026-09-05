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
exports.ProductRankingController = exports.RecordEventPayload = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const product_ranking_event_service_1 = require("./product-ranking-event.service");
const product_ranking_service_1 = require("./product-ranking.service");
const class_validator_1 = require("class-validator");
class RecordEventPayload {
}
exports.RecordEventPayload = RecordEventPayload;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RecordEventPayload.prototype, "event_type", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], RecordEventPayload.prototype, "drug_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordEventPayload.prototype, "pharmacy_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordEventPayload.prototype, "category", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsNumber)(),
    __metadata("design:type", Number)
], RecordEventPayload.prototype, "quantity", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsString)(),
    __metadata("design:type", String)
], RecordEventPayload.prototype, "session_id", void 0);
__decorate([
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.IsObject)(),
    __metadata("design:type", Object)
], RecordEventPayload.prototype, "metadata", void 0);

let ProductRankingController = class ProductRankingController {
    constructor(eventService, rankingService) {
        this.eventService = eventService;
        this.rankingService = rankingService;
    }

    async recordEvent(payload, req) {
        const user = req.user;
        const ipAddress = req.ip || req.socket.remoteAddress;
        const result = await this.eventService.recordEvent({
            eventType: payload.event_type,
            drugId: payload.drug_id,
            pharmacyId: payload.pharmacy_id || 'global',
            category: payload.category || 'general',
            quantity: payload.quantity || 1,
            userId: user?.id || user?.sub,
            sessionId: payload.session_id,
            ipAddress,
            metadata: payload.metadata,
        });
        return {
            status: 'success',
            ...result,
            timestamp: new Date().toISOString(),
        };
    }

    async getTelemetry(drugId, pharmacyId) {
        return this.rankingService.getTelemetry(drugId, pharmacyId || 'global');
    }
};
const auth_guard_1 = require("../../common/auth.guard");
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    (0, swagger_1.ApiOperation)({ summary: 'Record user interaction event for dynamic continuous re-ranking' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Event accepted and processed' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [RecordEventPayload, Object]),
    __metadata("design:returntype", Promise)
], ProductRankingController.prototype, "recordEvent", null);
__decorate([
    (0, common_1.Get)('telemetry/:drugId'),
    (0, swagger_1.ApiOperation)({ summary: 'Inspect live ranking telemetry and score calculation for a product' }),
    __param(0, (0, common_1.Param)('drugId')),
    __param(1, (0, common_1.Query)('pharmacy_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], ProductRankingController.prototype, "getTelemetry", null);
exports.ProductRankingController = ProductRankingController = __decorate([
    (0, swagger_1.ApiTags)('Product Ranking'),
    (0, common_1.Controller)('medicines/events'),
    __metadata("design:paramtypes", [product_ranking_event_service_1.ProductRankingEventService, product_ranking_service_1.ProductRankingService])
], ProductRankingController);
