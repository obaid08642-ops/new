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
exports.FinanceController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const commission_ledger_schema_1 = require("../schemas/commission-ledger.schema");
const withdrawal_request_schema_1 = require("../schemas/withdrawal-request.schema");
const finance_engine_module_1 = require("../../finance-engine/finance-engine.module");
const auth_guard_1 = require("../../../common/auth.guard");
let FinanceController = class FinanceController {
    constructor(commissionModel, withdrawalModel, providerWithdrawalModel, conn, ledger, approvals) {
        this.commissionModel = commissionModel;
        this.withdrawalModel = withdrawalModel;
        this.providerWithdrawalModel = providerWithdrawalModel;
        this.conn = conn;
        this.ledger = ledger;
        this.approvals = approvals;
    }
    async getCommissions() {
        const data = await this.commissionModel.find().exec();
        return { data };
    }
    async getPendingWithdrawals() {
        const [legacy, providerOps] = await Promise.all([
            this.withdrawalModel.find({ status: 'pending' }).lean().exec(),
            this.providerWithdrawalModel.find({ state: 'PENDING_ADMIN_APPROVAL' }, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).lean().exec(),
        ]);
        const normalized = [
            ...(legacy || []).map((w) => ({
                id: String(w._id),
                source: 'legacy',
                providerId: w.providerId || w.provider_id,
                providerName: w.providerName || w.provider_name,
                amount: w.amount,
                bankName: w.bankName,
                iban: w.iban,
                status: 'pending',
                createdAt: w.createdAt,
            })),
            ...(providerOps || []).map((w) => ({
                id: w.id,
                source: 'provider_ops',
                providerId: w.provider_id,
                providerName: w.provider_name,
                amount: w.amount,
                iban: w.iban,
                note: w.note,
                status: 'pending',
                createdAt: w.createdAt,
            })),
        ].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        return { data: normalized };
    }
    async executePayout(id, admin) {
        const legacyDoc = await this.withdrawalModel.findById(id).lean().catch(() => null);
        const opsDoc = legacyDoc ? null : await this.providerWithdrawalModel.findOne({ id, state: 'PENDING_ADMIN_APPROVAL' }, { _id: 0, __v: 0 }).lean();
        if (!legacyDoc && !opsDoc)
            throw new common_1.NotFoundException('withdrawal not found or already decided');
        const providerId = legacyDoc ? (legacyDoc.providerId || legacyDoc.provider_id) : opsDoc.provider_id;
        const amount = Number(legacyDoc ? legacyDoc.amount : opsDoc.amount) || 0;
        const bal = await this.ledger.providerBalance(providerId);
        const reservation = opsDoc
            ? await this.conn.collection('platformledgerentries').findOne({ type: 'payout', state: 'locked', ref_type: 'withdrawal_reservation', ref_id: id, provider_account_id: providerId })
            : null;
        if (opsDoc && (!reservation || Number(reservation.amount) !== amount)) {
            throw new common_1.BadRequestException('withdrawal_reservation_missing_or_mismatched');
        }
        const executableBalance = bal.available + (reservation ? Number(reservation.amount) : 0);
        if (amount > executableBalance + 0.001) {
            throw new common_1.BadRequestException(`payout_exceeds_available: requested ${amount} SAR, available ${executableBalance} SAR${bal.negative ? ' (provider has negative balance debt)' : ''}`);
        }
        const th = await this.approvals.thresholds();
        if (amount >= th.large_payout_sar) {
            const op = await this.approvals.request('large_payout', {
                withdrawal_id: id, provider_account_id: providerId, amount,
                source: legacyDoc ? 'legacy' : 'provider_ops',
            }, admin?.id || 'admin', `large payout ${amount} SAR to provider ${providerId}`);
            return { success: false, routed_to_approval: true, operation_id: op.id, message: 'المبلغ كبير — تم إرسال العملية لموافقة أدمن آخر (maker-checker)' };
        }
        if (legacyDoc) {
            await this.withdrawalModel.findByIdAndUpdate(id, { status: 'completed', decided_at: new Date() });
        }
        else {
            await this.providerWithdrawalModel.findOneAndUpdate({ id, state: 'PENDING_ADMIN_APPROVAL' }, { $set: { state: 'PAID', decided_at: new Date() } });
            await this.conn.collection('platformledgerentries').updateOne({ id: reservation.id, state: 'locked' }, { $set: { state: 'cleared', cleared_at: new Date(), actor_id: admin?.id || 'admin' } });
        }
        const dup = legacyDoc ? await this.ledger.exists('payout', 'withdrawal', id) : true;
        if (!dup) {
            await this.ledger.append({
                type: 'payout', amount, provider_account_id: providerId,
                ref_type: 'withdrawal', ref_id: id,
                description: `Payout executed by ${admin?.id || 'admin'}`,
                actor_id: admin?.id,
            });
        }
        return { success: true, message: 'Payout executed successfully', amount, provider_id: providerId, available_after: (await this.ledger.providerBalance(providerId)).available, source: legacyDoc ? 'legacy' : 'provider_ops' };
    }
    async rejectPayout(id, body) {
        const legacy = await this.withdrawalModel.findByIdAndUpdate(id, { status: 'rejected' }, { new: true }).catch(() => null);
        if (legacy) {
            return { success: true, withdrawal: legacy, source: 'legacy' };
        }
        const doc = await this.providerWithdrawalModel.findOneAndUpdate({ id, state: 'PENDING_ADMIN_APPROVAL' }, { $set: { state: 'REJECTED', note: body?.reason || undefined, decided_at: new Date() } }, { new: true });
        if (!doc)
            throw new common_1.NotFoundException('withdrawal not found or already decided');
        await this.conn.collection('platformledgerentries').updateOne({ type: 'payout', state: 'locked', ref_type: 'withdrawal_reservation', ref_id: id, provider_account_id: doc.provider_id }, { $set: { state: 'released', released_at: new Date(), release_reason: body?.reason || 'admin_rejected' } });
        return { success: true, withdrawal: doc, source: 'provider_ops' };
    }
};
exports.FinanceController = FinanceController;
__decorate([
    (0, common_1.Get)('commissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getCommissions", null);
__decorate([
    (0, common_1.Get)('withdrawals/pending'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "getPendingWithdrawals", null);
__decorate([
    (0, common_1.Post)('withdrawals/:id/execute'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "executePayout", null);
__decorate([
    (0, common_1.Post)('withdrawals/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], FinanceController.prototype, "rejectPayout", null);
exports.FinanceController = FinanceController = __decorate([
    (0, common_1.Controller)('admin/finance'),
    __param(0, (0, mongoose_1.InjectModel)(commission_ledger_schema_1.CommissionLedger.name)),
    __param(1, (0, mongoose_1.InjectModel)(withdrawal_request_schema_1.WithdrawalRequest.name)),
    __param(2, (0, mongoose_1.InjectModel)('ProviderWithdrawal')),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Connection,
        finance_engine_module_1.LedgerService,
        finance_engine_module_1.ApprovalService])
], FinanceController);
//# sourceMappingURL=finance.controller.js.map