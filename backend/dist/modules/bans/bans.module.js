"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.BansModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const bans_schema_1 = require("./bans.schema");
const bans_service_1 = require("./bans.service");
const bans_controller_1 = require("./bans.controller");
const ban_repository_1 = require("./repositories/ban.repository");
let BansModule = class BansModule {
};
exports.BansModule = BansModule;
exports.BansModule = BansModule = __decorate([
    (0, common_1.Global)(),
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: bans_schema_1.Ban.name, schema: bans_schema_1.BanSchema }])],
        controllers: [bans_controller_1.BansController],
        providers: [bans_service_1.BansService, { provide: 'BanRepository', useClass: ban_repository_1.BanRepository }],
        exports: [bans_service_1.BansService],
    })
], BansModule);
//# sourceMappingURL=bans.module.js.map