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
exports.AdminExtendedOperationsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const procurement_request_schema_1 = require("../schemas/procurement-request.schema");
let AdminExtendedOperationsController = class AdminExtendedOperationsController {
    constructor(procurementModel) {
        this.procurementModel = procurementModel;
    }
    async getPendingProcurement() {
        const data = await this.procurementModel.find({ status: 'PENDING_ADMIN_REVIEW' }).exec();
        return { data };
    }
    async issueWarehouseQuotation(procurementId, body) {
        const updatedProcurement = await this.procurementModel.findByIdAndUpdate(procurementId, {
            $set: {
                items: body.pricingItems,
                total_warehouse_quotation_price: body.totalPrice,
                status: 'QUOTATION_ISSUED'
            }
        }, { new: true });
        if (!updatedProcurement)
            throw new common_1.BadRequestException('B2B procurement ticket reference index not registered.');
        return { success: true, message: 'تمت صياغة تسعيرة المستودع بنجاح، وترحيل الفاتورة للصيدلية للتأكيد والدفع.' };
    }
};
exports.AdminExtendedOperationsController = AdminExtendedOperationsController;
__decorate([
    (0, common_1.Get)('procurement/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminExtendedOperationsController.prototype, "getPendingProcurement", null);
__decorate([
    (0, common_1.Patch)('issue-quote/:procurementId'),
    __param(0, (0, common_1.Param)('procurementId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminExtendedOperationsController.prototype, "issueWarehouseQuotation", null);
exports.AdminExtendedOperationsController = AdminExtendedOperationsController = __decorate([
    (0, common_1.Controller)('admin/extended-operations'),
    __param(0, (0, mongoose_1.InjectModel)(procurement_request_schema_1.ProcurementRequest.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], AdminExtendedOperationsController);
//# sourceMappingURL=admin-extended-operations.controller.js.map