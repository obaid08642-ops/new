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
exports.SystemConfigExtendedSchema = exports.SystemConfigExtended = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let SystemConfigExtended = class SystemConfigExtended {
};
exports.SystemConfigExtended = SystemConfigExtended;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], SystemConfigExtended.prototype, "config_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], SystemConfigExtended.prototype, "config_value_matrix", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], SystemConfigExtended.prototype, "last_modified_by_admin_id", void 0);
exports.SystemConfigExtended = SystemConfigExtended = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], SystemConfigExtended);
exports.SystemConfigExtendedSchema = mongoose_1.SchemaFactory.createForClass(SystemConfigExtended);
//# sourceMappingURL=system-config-extended.schema.js.map