"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyOpsModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const pharmacy_ops_controller_1 = require("./pharmacy_ops.controller");
const pharmacy_ops_service_1 = require("./pharmacy_ops.service");
const order_schema_1 = require("../../schemas/order.schema");
const medicine_schema_1 = require("../../schemas/medicine.schema");
const inventory_schema_1 = require("../../schemas/inventory.schema");
const orders_module_1 = require("../orders/orders.module");
const medicine_repository_1 = require("./repositories/medicine.repository");
const order_repository_1 = require("./repositories/order.repository");
const pharmacyinventory_repository_1 = require("./repositories/pharmacyinventory.repository");
let PharmacyOpsModule = class PharmacyOpsModule {
};
exports.PharmacyOpsModule = PharmacyOpsModule;
exports.PharmacyOpsModule = PharmacyOpsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: order_schema_1.Order.name, schema: order_schema_1.OrderSchema },
                { name: medicine_schema_1.Medicine.name, schema: medicine_schema_1.MedicineSchema },
                { name: inventory_schema_1.PharmacyInventory.name, schema: inventory_schema_1.PharmacyInventorySchema },
            ]),
            orders_module_1.OrdersModule,
        ],
        controllers: [pharmacy_ops_controller_1.PharmacyOpsController, pharmacy_ops_controller_1.ProviderPharmacyAliasController],
        providers: [pharmacy_ops_service_1.PharmacyOpsService, { provide: 'MedicineRepository', useClass: medicine_repository_1.MedicineRepository }, { provide: 'OrderRepository', useClass: order_repository_1.OrderRepository }, { provide: 'PharmacyInventoryRepository', useClass: pharmacyinventory_repository_1.PharmacyInventoryRepository }],
    })
], PharmacyOpsModule);
//# sourceMappingURL=pharmacy_ops.module.js.map