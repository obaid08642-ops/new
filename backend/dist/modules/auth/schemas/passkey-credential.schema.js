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
exports.PasskeyCredentialSchema = exports.PasskeyCredential = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let PasskeyCredential = class PasskeyCredential extends mongoose_2.Document {
};
exports.PasskeyCredential = PasskeyCredential;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PasskeyCredential.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], PasskeyCredential.prototype, "credential_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Buffer, required: true }),
    __metadata("design:type", Buffer)
], PasskeyCredential.prototype, "public_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PasskeyCredential.prototype, "counter", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], PasskeyCredential.prototype, "transports", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], PasskeyCredential.prototype, "device_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null }),
    __metadata("design:type", Date)
], PasskeyCredential.prototype, "last_used_at", void 0);
exports.PasskeyCredential = PasskeyCredential = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'passkey_credentials' })
], PasskeyCredential);
exports.PasskeyCredentialSchema = mongoose_1.SchemaFactory.createForClass(PasskeyCredential);
//# sourceMappingURL=passkey-credential.schema.js.map