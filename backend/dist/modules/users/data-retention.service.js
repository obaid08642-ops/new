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
var DataRetentionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataRetentionService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const user_schema_1 = require("../../schemas/user.schema");
let DataRetentionService = DataRetentionService_1 = class DataRetentionService {
    constructor(userModel) {
        this.userModel = userModel;
        this.logger = new common_1.Logger(DataRetentionService_1.name);
    }
    async enforceDataRetention() {
        this.logger.log('Starting PDPL Data Retention cleanup...');
        const retentionDays = parseInt(process.env.DATA_RETENTION_DAYS || '30', 10);
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        try {
            const result = await this.userModel.deleteMany({
                deleted_at: { $lte: cutoffDate },
            });
            if (result.deletedCount > 0) {
                this.logger.log(`Hard-deleted ${result.deletedCount} users exceeding retention policy (${retentionDays} days).`);
            }
            else {
                this.logger.log('No stale data found for hard-deletion.');
            }
        }
        catch (error) {
            this.logger.error('Data retention cleanup failed', error.stack);
        }
    }
};
exports.DataRetentionService = DataRetentionService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_DAY_AT_3AM),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], DataRetentionService.prototype, "enforceDataRetention", null);
exports.DataRetentionService = DataRetentionService = DataRetentionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], DataRetentionService);
//# sourceMappingURL=data-retention.service.js.map