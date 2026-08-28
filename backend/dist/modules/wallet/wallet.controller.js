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
exports.WalletController = void 0;
const common_1 = require("@nestjs/common");
const wallet_service_1 = require("./wallet.service");
const auth_guard_1 = require("../../common/auth.guard");
let WalletController = class WalletController {
    constructor(walletService) {
        this.walletService = walletService;
    }
    async getBalance(user) {
        const ownerType = user.role === 'patient' ? 'patient' : 'provider';
        const balance = await this.walletService.getBalance(user.id, ownerType);
        return { balance };
    }
    async getTransactions(user, page = 1, limit = 20) {
        const ownerType = user.role === 'patient' ? 'patient' : 'provider';
        return this.walletService.getTransactions(user.id, ownerType, +page, +limit);
    }
    async getSpendingData(user) {
        const ownerType = user.role === 'patient' ? 'patient' : 'provider';
        return this.walletService.getSpendingData(user.id, ownerType);
    }
    async topup(user, body) {
        if (!body.amount)
            throw new common_1.BadRequestException('amount_required');
        const ownerType = user.role === 'patient' ? 'patient' : 'provider';
        const intent = await this.walletService.createTopupIntent(user.id, ownerType, body.amount);
        return { success: true, requires_payment: true, ...intent };
    }
    async confirmTopup(user, body) {
        if (!body?.topup_id)
            throw new common_1.BadRequestException('topup_id_required');
        return this.walletService.confirmTopup(user.id, body.topup_id);
    }
    async getTopup(user, id) {
        return this.walletService.getTopup(user.id, id);
    }
    async transfer(user, body) {
        if (!body.recipient || !body.amount)
            throw new common_1.BadRequestException('recipient_and_amount_required');
        const ownerType = user.role === 'patient' ? 'patient' : 'provider';
        const wallet = await this.walletService.transfer(user.id, ownerType, body.recipient, body.amount);
        return { success: true, balance: wallet.balance };
    }
    async getCards(user) {
        const ownerType = user.role === 'patient' ? 'patient' : 'provider';
        const cards = await this.walletService.getCards(user.id, ownerType);
        return { success: true, cards };
    }
    async addCard(user, body) {
        const ownerType = user.role === 'patient' ? 'patient' : 'provider';
        const cards = await this.walletService.addCard(user.id, ownerType, body);
        return { success: true, cards };
    }
    async removeCard(user, cardId) {
        const ownerType = user.role === 'patient' ? 'patient' : 'provider';
        const cards = await this.walletService.removeCard(user.id, ownerType, cardId);
        return { success: true, cards };
    }
};
exports.WalletController = WalletController;
__decorate([
    (0, common_1.Get)('balance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getBalance", null);
__decorate([
    (0, common_1.Get)('transactions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getTransactions", null);
__decorate([
    (0, common_1.Get)('spending-data'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getSpendingData", null);
__decorate([
    (0, common_1.Post)('topup'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "topup", null);
__decorate([
    (0, common_1.Post)('topup/confirm'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "confirmTopup", null);
__decorate([
    (0, common_1.Get)('topup/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getTopup", null);
__decorate([
    (0, common_1.Post)('transfer'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "transfer", null);
__decorate([
    (0, common_1.Get)('cards'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "getCards", null);
__decorate([
    (0, common_1.Post)('cards'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "addCard", null);
__decorate([
    (0, common_1.Delete)('cards/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], WalletController.prototype, "removeCard", null);
exports.WalletController = WalletController = __decorate([
    (0, common_1.Controller)('wallet'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [wallet_service_1.WalletService])
], WalletController);
//# sourceMappingURL=wallet.controller.js.map