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
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletTransactionSchema = exports.WalletTransaction = exports.WalletSchema = exports.Wallet = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let Wallet = class Wallet {
};
exports.Wallet = Wallet;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], Wallet.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Wallet.prototype, "ownerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['patient', 'provider'], index: true }),
    __metadata("design:type", String)
], Wallet.prototype, "ownerType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], Wallet.prototype, "balance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ id: String, type: String, last4: String, holderName: String, expiry: String, isDefault: Boolean, gradient: [String] }], default: [] }),
    __metadata("design:type", Array)
], Wallet.prototype, "savedCards", void 0);
exports.Wallet = Wallet = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'wallets' })
], Wallet);
exports.WalletSchema = mongoose_1.SchemaFactory.createForClass(Wallet);
exports.WalletSchema.index({ ownerId: 1, ownerType: 1 }, { unique: true });
let WalletTransaction = class WalletTransaction {
};
exports.WalletTransaction = WalletTransaction;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "walletId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], WalletTransaction.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['credit', 'debit'] }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['booking', 'refund', 'referral', 'commission', 'insurance_escrow'], index: true }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "referenceType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "referenceId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WalletTransaction.prototype, "description", void 0);
exports.WalletTransaction = WalletTransaction = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'wallet_transactions' })
], WalletTransaction);
exports.WalletTransactionSchema = mongoose_1.SchemaFactory.createForClass(WalletTransaction);
exports.WalletTransactionSchema.index({ walletId: 1, createdAt: -1 });
//# sourceMappingURL=wallet.schema.js.map