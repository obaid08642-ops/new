"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReturnsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const returns_controller_1 = require("./returns.controller");
const returns_service_1 = require("./returns.service");
const returns_schema_1 = require("../../schemas/returns.schema");
const wallet_module_1 = require("../wallet/wallet.module");
const returnrequest_repository_1 = require("./repositories/returnrequest.repository");
let ReturnsModule = class ReturnsModule {
};
exports.ReturnsModule = ReturnsModule;
exports.ReturnsModule = ReturnsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([{ name: returns_schema_1.ReturnRequest.name, schema: returns_schema_1.ReturnRequestSchema }]),
            wallet_module_1.WalletModule,
        ],
        controllers: [returns_controller_1.ReturnsController],
        providers: [returns_service_1.ReturnsService, { provide: 'ReturnRequestRepository', useClass: returnrequest_repository_1.ReturnRequestRepository }],
        exports: [returns_service_1.ReturnsService],
    })
], ReturnsModule);
//# sourceMappingURL=returns.module.js.map