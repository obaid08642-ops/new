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
exports.TourController = void 0;
const common_1 = require("@nestjs/common");
const tour_service_1 = require("./tour.service");
const auth_guard_1 = require("../../common/auth.guard");
let TourController = class TourController {
    constructor(tourSvc) {
        this.tourSvc = tourSvc;
    }
    async getStatus(userId) {
        return this.tourSvc.getUserTourStatus(userId);
    }
    async completeStep(userId, stepId) {
        return this.tourSvc.markStepComplete(userId, stepId);
    }
};
exports.TourController = TourController;
__decorate([
    (0, common_1.Get)('status'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TourController.prototype, "getStatus", null);
__decorate([
    (0, common_1.Post)('complete'),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)('stepId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], TourController.prototype, "completeStep", null);
exports.TourController = TourController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.Controller)('tour'),
    __metadata("design:paramtypes", [tour_service_1.TourService])
], TourController);
//# sourceMappingURL=tour.controller.js.map