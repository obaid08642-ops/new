"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrdersModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const orders_controller_1 = require("./orders.controller");
const orders_service_1 = require("./orders.service");
const dispatch_service_1 = require("./dispatch.service");
const order_schema_1 = require("../../schemas/order.schema");
const medicine_schema_1 = require("../../schemas/medicine.schema");
const delivery_schema_1 = require("../../schemas/delivery.schema");
const provider_profile_schema_1 = require("../../schemas/provider-profile.schema");
const inventory_schema_1 = require("../../schemas/inventory.schema");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const finance_engine_module_1 = require("../finance-engine/finance-engine.module");
const delivery_repository_1 = require("./repositories/delivery.repository");
const medicine_repository_1 = require("./repositories/medicine.repository");
const order_repository_1 = require("./repositories/order.repository");
const pharmacybid_repository_1 = require("./repositories/pharmacybid.repository");
const pharmacyinventory_repository_1 = require("./repositories/pharmacyinventory.repository");
const providerprofile_repository_1 = require("./repositories/providerprofile.repository");
let OrdersModule = class OrdersModule {
};
exports.OrdersModule = OrdersModule;
exports.OrdersModule = OrdersModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule,
            finance_engine_module_1.FinanceEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: order_schema_1.Order.name, schema: order_schema_1.OrderSchema },
                { name: medicine_schema_1.Medicine.name, schema: medicine_schema_1.MedicineSchema },
                { name: delivery_schema_1.Delivery.name, schema: delivery_schema_1.DeliverySchema },
                { name: provider_profile_schema_1.ProviderProfile.name, schema: provider_profile_schema_1.ProviderProfileSchema },
                { name: inventory_schema_1.PharmacyInventory.name, schema: inventory_schema_1.PharmacyInventorySchema },
                { name: order_schema_1.PharmacyBid.name, schema: order_schema_1.PharmacyBidSchema },
            ]),
        ],
        controllers: [orders_controller_1.OrdersController],
        providers: [orders_service_1.OrdersService, dispatch_service_1.DispatchService, { provide: 'DeliveryRepository', useClass: delivery_repository_1.DeliveryRepository }, { provide: 'MedicineRepository', useClass: medicine_repository_1.MedicineRepository }, { provide: 'OrderRepository', useClass: order_repository_1.OrderRepository }, { provide: 'PharmacyBidRepository', useClass: pharmacybid_repository_1.PharmacyBidRepository }, { provide: 'PharmacyInventoryRepository', useClass: pharmacyinventory_repository_1.PharmacyInventoryRepository }, { provide: 'ProviderProfileRepository', useClass: providerprofile_repository_1.ProviderProfileRepository }],
        exports: [orders_service_1.OrdersService, dispatch_service_1.DispatchService],
    })
], OrdersModule);
//# sourceMappingURL=orders.module.js.map