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
exports.LeaveRequestsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
let LeaveRequestsController = class LeaveRequestsController {
    constructor(leaveModel) {
        this.leaveModel = leaveModel;
    }
    async getLeaveRequests(facility, _) {
        return this.leaveModel
            .find({ facility_id: facility.id })
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();
    }
    async createLeaveRequest(user, body) {
        if (!body?.start_date || !body?.end_date)
            throw new common_1.BadRequestException('start_date and end_date are required');
        const start = new Date(body.start_date);
        const end = new Date(body.end_date);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
            throw new common_1.BadRequestException('invalid date range');
        }
        const doc = await this.leaveModel.create({
            facility_id: body.facility_id || user.id,
            provider_account_id: user.id,
            provider_name: body.provider_name || user.full_name,
            provider_type: body.provider_type || user.role,
            type: body.type || 'vacation',
            start_date: start,
            end_date: end,
            reason: body.reason,
            status: 'pending',
        });
        return doc.toObject();
    }
    async updateLeaveRequest(facility, body) {
        if (!body?.id || !['approved', 'rejected'].includes(body?.action)) {
            throw new common_1.BadRequestException('id and a valid action (approved|rejected) are required');
        }
        const doc = await this.leaveModel.findOneAndUpdate({ id: body.id, facility_id: facility.id, status: 'pending' }, { $set: { status: body.action, decided_by: facility.id, decided_at: new Date(), decision_note: body.note } }, { new: true });
        if (!doc)
            throw new common_1.NotFoundException('pending leave request not found for this facility');
        return { success: true, id: doc.id, status: doc.status };
    }
};
exports.LeaveRequestsController = LeaveRequestsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeaveRequestsController.prototype, "getLeaveRequests", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeaveRequestsController.prototype, "createLeaveRequest", null);
__decorate([
    (0, common_1.Post)('action'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], LeaveRequestsController.prototype, "updateLeaveRequest", null);
exports.LeaveRequestsController = LeaveRequestsController = __decorate([
    (0, common_1.Controller)('provider/leave-requests'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectModel)('LeaveRequest')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], LeaveRequestsController);
//# sourceMappingURL=leave-requests.controller.js.map