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
var PharmacyExpiryScheduler_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyExpiryScheduler = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const pharmacy_expiry_command_service_1 = require("./pharmacy-expiry-command.service");
let PharmacyExpiryScheduler = PharmacyExpiryScheduler_1 = class PharmacyExpiryScheduler {
    constructor(expiry) {
        this.expiry = expiry;
        this.logger = new common_1.Logger(PharmacyExpiryScheduler_1.name);
    }
    async sweep() {
        try {
            await this.expiry.expireDuePharmacyOffers(new Date());
        }
        catch (error) {
            this.logger.warn(`pharmacy expiry sweep failed: ${error?.message || error}`);
        }
    }
};
exports.PharmacyExpiryScheduler = PharmacyExpiryScheduler;
__decorate([
    (0, schedule_1.Interval)(15_000),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], PharmacyExpiryScheduler.prototype, "sweep", null);
exports.PharmacyExpiryScheduler = PharmacyExpiryScheduler = PharmacyExpiryScheduler_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [pharmacy_expiry_command_service_1.PharmacyExpiryCommandService])
], PharmacyExpiryScheduler);
//# sourceMappingURL=pharmacy-expiry.scheduler.js.map