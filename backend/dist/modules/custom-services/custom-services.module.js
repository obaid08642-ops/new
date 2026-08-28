"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomServicesModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const custom_services_controller_1 = require("./custom-services.controller");
const custom_services_service_1 = require("./custom-services.service");
const custom_service_schema_1 = require("../../schemas/custom-service.schema");
const customservicerequest_repository_1 = require("./repositories/customservicerequest.repository");
let CustomServicesModule = class CustomServicesModule {
};
exports.CustomServicesModule = CustomServicesModule;
exports.CustomServicesModule = CustomServicesModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: 'CustomServiceRequest', schema: custom_service_schema_1.CustomServiceRequestSchema },
            ])],
        controllers: [custom_services_controller_1.CustomServicesController],
        providers: [custom_services_service_1.CustomServicesService, { provide: 'CustomServiceRequestRepository', useClass: customservicerequest_repository_1.CustomServiceRequestRepository }],
    })
], CustomServicesModule);
//# sourceMappingURL=custom-services.module.js.map