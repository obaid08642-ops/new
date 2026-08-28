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
exports.FeatureFlagsService = void 0;
const common_1 = require("@nestjs/common");
const featureflag_repository_1 = require("./repositories/featureflag.repository");
let FeatureFlagsService = class FeatureFlagsService {
    constructor(flagModel) {
        this.flagModel = flagModel;
    }
    async isEnabled(flagKey) {
        const flag = await this.flagModel.findOne({ key: flagKey }).exec();
        return flag ? flag.enabled : false;
    }
    async setFlag(flagKey, enabled) {
        return this.flagModel.findOneAndUpdate({ key: flagKey }, { enabled }, { upsert: true, new: true }).exec();
    }
    async getAll() {
        return this.flagModel.find({}).exec();
    }
};
exports.FeatureFlagsService = FeatureFlagsService;
exports.FeatureFlagsService = FeatureFlagsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('FeatureFlagRepository')),
    __metadata("design:paramtypes", [featureflag_repository_1.FeatureFlagRepository])
], FeatureFlagsService);
//# sourceMappingURL=feature-flags.service.js.map