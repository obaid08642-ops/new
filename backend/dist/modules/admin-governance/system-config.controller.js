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
exports.SystemConfigController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const system_config_schema_1 = require("../../schemas/system-config.schema");
let SystemConfigController = class SystemConfigController {
    constructor(configModel) {
        this.configModel = configModel;
    }
    async getConfig() {
        const key = 'system_config';
        let config = await this.configModel.findOne({ key }).lean();
        if (!config) {
            config = await this.configModel.create({ key, value: {} });
        }
        return { key: config.key, value: config.value };
    }
    async updateConfig(body) {
        const key = 'system_config';
        const updated = await this.configModel.findOneAndUpdate({ key }, { value: body.value }, { new: true, upsert: true }).lean();
        return { key: updated.key, value: updated.value };
    }
};
exports.SystemConfigController = SystemConfigController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], SystemConfigController.prototype, "getConfig", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SystemConfigController.prototype, "updateConfig", null);
exports.SystemConfigController = SystemConfigController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    (0, common_1.Controller)('admin/governance/system-config'),
    __param(0, (0, mongoose_1.InjectModel)(system_config_schema_1.SystemConfig.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], SystemConfigController);
//# sourceMappingURL=system-config.controller.js.map