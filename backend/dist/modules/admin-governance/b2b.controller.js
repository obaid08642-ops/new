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
exports.B2BController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
let B2BController = class B2BController {
    constructor(b2bModel) {
        this.b2bModel = b2bModel;
    }
    async list() {
        let requests = await this.b2bModel.find().sort({ submitted: -1 }).lean();
        return requests;
    }
    async approve(id, body) {
        const req = await this.b2bModel.findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        req.status = 'approved';
        if (body?.note)
            req.notes = (req.notes ? req.notes + ' | ' : '') + 'ملاحظة أدمن: ' + body.note;
        await req.save();
        return req.toObject();
    }
    async reject(id, body) {
        const req = await this.b2bModel.findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('Request not found');
        req.status = 'rejected';
        if (body?.note)
            req.notes = (req.notes ? req.notes + ' | ' : '') + 'سبب الرفض: ' + body.note;
        await req.save();
        return req.toObject();
    }
};
exports.B2BController = B2BController;
__decorate([
    (0, common_1.Get)('requests'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], B2BController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('requests/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], B2BController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('requests/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], B2BController.prototype, "reject", null);
exports.B2BController = B2BController = __decorate([
    (0, common_1.Controller)('b2b'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectModel)('B2BRequest')),
    __metadata("design:paramtypes", [mongoose_2.Model])
], B2BController);
//# sourceMappingURL=b2b.controller.js.map