"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProductRankingModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const product_ranking_metrics_schema_1 = require("../../schemas/product-ranking-metrics.schema");
const product_ranking_service_1 = require("./product-ranking.service");
const product_ranking_event_service_1 = require("./product-ranking-event.service");
const product_ranking_controller_1 = require("./product-ranking.controller");

let ProductRankingModule = class ProductRankingModule {
};
exports.ProductRankingModule = ProductRankingModule;
exports.ProductRankingModule = ProductRankingModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: product_ranking_metrics_schema_1.ProductRankingMetrics.name, schema: product_ranking_metrics_schema_1.ProductRankingMetricsSchema },
            ]),
        ],
        controllers: [product_ranking_controller_1.ProductRankingController],
        providers: [product_ranking_service_1.ProductRankingService, product_ranking_event_service_1.ProductRankingEventService],
        exports: [product_ranking_service_1.ProductRankingService, product_ranking_event_service_1.ProductRankingEventService],
    })
], ProductRankingModule);
