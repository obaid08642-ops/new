"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriversModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const drivers_controller_1 = require("./drivers.controller");
const drivers_service_1 = require("./drivers.service");
const user_schema_1 = require("../../schemas/user.schema");
const driver_shift_schema_1 = require("../../schemas/driver-shift.schema");
const order_schema_1 = require("../../schemas/order.schema");
const delivery_schema_1 = require("../../schemas/delivery.schema");
const realtime_module_1 = require("../realtime/realtime.module");
const delivery_repository_1 = require("./repositories/delivery.repository");
const drivershift_repository_1 = require("./repositories/drivershift.repository");
const order_repository_1 = require("./repositories/order.repository");
const user_repository_1 = require("./repositories/user.repository");
let DriversModule = class DriversModule {
};
exports.DriversModule = DriversModule;
exports.DriversModule = DriversModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: user_schema_1.User.name, schema: user_schema_1.UserSchema },
                { name: driver_shift_schema_1.DriverShift.name, schema: driver_shift_schema_1.DriverShiftSchema },
                { name: order_schema_1.Order.name, schema: order_schema_1.OrderSchema },
                { name: delivery_schema_1.Delivery.name, schema: delivery_schema_1.DeliverySchema },
            ]),
            realtime_module_1.RealtimeModule,
        ],
        controllers: [drivers_controller_1.DriversController],
        providers: [drivers_service_1.DriversService, { provide: 'DeliveryRepository', useClass: delivery_repository_1.DeliveryRepository }, { provide: 'DriverShiftRepository', useClass: drivershift_repository_1.DriverShiftRepository }, { provide: 'OrderRepository', useClass: order_repository_1.OrderRepository }, { provide: 'UserRepository', useClass: user_repository_1.UserRepository }],
        exports: [drivers_service_1.DriversService],
    })
], DriversModule);
//# sourceMappingURL=drivers.module.js.map