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
exports.UniversalActivitySchema = exports.UniversalActivity = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
let UniversalActivity = class UniversalActivity {
};
exports.UniversalActivity = UniversalActivity;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], UniversalActivity.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], UniversalActivity.prototype, "eventType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], UniversalActivity.prototype, "userId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], UniversalActivity.prototype, "providerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Schema.Types.Mixed, default: {} }),
    __metadata("design:type", Object)
], UniversalActivity.prototype, "metadata", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date(), index: true }),
    __metadata("design:type", Date)
], UniversalActivity.prototype, "timestamp", void 0);
exports.UniversalActivity = UniversalActivity = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'universal_activities' })
], UniversalActivity);
exports.UniversalActivitySchema = mongoose_1.SchemaFactory.createForClass(UniversalActivity);
exports.UniversalActivitySchema.index({ eventType: 1, timestamp: -1 });
//# sourceMappingURL=universal-activity.schema.js.map