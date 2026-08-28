"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymobModule = void 0;
const common_1 = require("@nestjs/common");
const paymob_controller_1 = require("./paymob.controller");
const paymob_service_1 = require("./paymob.service");
let PaymobModule = class PaymobModule {
};
exports.PaymobModule = PaymobModule;
exports.PaymobModule = PaymobModule = __decorate([
    (0, common_1.Module)({
        controllers: [paymob_controller_1.PaymobController],
        providers: [paymob_service_1.PaymobService],
        exports: [paymob_service_1.PaymobService],
    })
], PaymobModule);
//# sourceMappingURL=paymob.module.js.map