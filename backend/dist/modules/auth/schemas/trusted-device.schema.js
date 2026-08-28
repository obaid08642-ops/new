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
exports.TrustedDeviceSchema = exports.TrustedDevice = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const crypto_1 = require("crypto");
let TrustedDevice = class TrustedDevice {
};
exports.TrustedDevice = TrustedDevice;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, crypto_1.randomUUID)() }),
    __metadata("design:type", String)
], TrustedDevice.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], TrustedDevice.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], TrustedDevice.prototype, "token_hash", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TrustedDevice.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TrustedDevice.prototype, "user_agent", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TrustedDevice.prototype, "ip", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], TrustedDevice.prototype, "last_ip", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], TrustedDevice.prototype, "last_seen_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], TrustedDevice.prototype, "revoked", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], TrustedDevice.prototype, "created_at", void 0);
exports.TrustedDevice = TrustedDevice = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'trusted_devices' })
], TrustedDevice);
exports.TrustedDeviceSchema = mongoose_1.SchemaFactory.createForClass(TrustedDevice);
//# sourceMappingURL=trusted-device.schema.js.map