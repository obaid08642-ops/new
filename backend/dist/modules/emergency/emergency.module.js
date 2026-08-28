"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmergencyModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const emergency_controller_1 = require("./emergency.controller");
const emergency_service_1 = require("./emergency.service");
const emergency_schema_1 = require("../../schemas/emergency.schema");
const emergencyrequest_repository_1 = require("./repositories/emergencyrequest.repository");
const ambulance_vehicle_schema_1 = require("../../schemas/ambulance-vehicle.schema");
const ambulance_fleet_controller_1 = require("./ambulance-fleet.controller");
let EmergencyModule = class EmergencyModule {
};
exports.EmergencyModule = EmergencyModule;
exports.EmergencyModule = EmergencyModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([
                { name: emergency_schema_1.EmergencyRequest.name, schema: emergency_schema_1.EmergencyRequestSchema },
                { name: ambulance_vehicle_schema_1.AmbulanceVehicle.name, schema: ambulance_vehicle_schema_1.AmbulanceVehicleSchema },
            ])],
        controllers: [emergency_controller_1.EmergencyController, ambulance_fleet_controller_1.ProviderAmbulanceFleetController, ambulance_fleet_controller_1.AdminAmbulanceFleetController],
        providers: [emergency_service_1.EmergencyService, ambulance_fleet_controller_1.AmbulanceFleetService, { provide: 'EmergencyRequestRepository', useClass: emergencyrequest_repository_1.EmergencyRequestRepository }],
        exports: [emergency_service_1.EmergencyService],
    })
], EmergencyModule);
//# sourceMappingURL=emergency.module.js.map