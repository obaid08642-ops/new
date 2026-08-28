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
exports.ProviderModerationController = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const mongoose_3 = require("@nestjs/mongoose");
const provider_schema_1 = require("../schemas/provider.schema");
let ProviderModerationController = class ProviderModerationController {
    constructor(providerModel, connection, events) {
        this.providerModel = providerModel;
        this.connection = connection;
        this.events = events;
    }
    async purgeReplaced(oldProf, changes) {
        const IMAGE_KEYS = ['profile_photo', 'logo', 'clinic_images', 'license_documents', 'images'];
        const toUrl = async (v) => {
            const s2 = String(v);
            if (s2.startsWith('http'))
                return s2;
            const obj = await this.connection.collection('storage_objects').findOne({ id: s2 });
            return obj?.external_url || null;
        };
        for (const k of IMAGE_KEYS) {
            if (changes[k] === undefined)
                continue;
            const oldVals = Array.isArray(oldProf?.[k]) ? oldProf[k] : (oldProf?.[k] ? [oldProf[k]] : []);
            const newVals = new Set((Array.isArray(changes[k]) ? changes[k] : [changes[k]]).map(String));
            for (const ov of oldVals) {
                if (newVals.has(String(ov)))
                    continue;
                const url = await toUrl(ov).catch(() => null);
                if (url)
                    this.events.emit('storage.delete_by_url', { url });
            }
        }
    }
    async getProviderDeltas() {
        const data = await this.connection.collection('provider_deltas').find({ status: 'pending' }).toArray();
        return data;
    }
    async approveDelta(id) {
        const delta = await this.connection.collection('provider_deltas').findOne({ id });
        if (!delta)
            throw new common_1.NotFoundException('التغييرات المطلوبة غير موجودة');
        if (delta.status !== 'pending')
            throw new common_1.BadRequestException(`التغييرات تمت معالجتها مسبقاً (${delta.status})`);
        let changes = delta.requested_changes || delta.changes || {};
        if (changes && typeof changes === 'object' && typeof changes.changes === 'object' && changes.changes)
            changes = changes.changes;
        else if (changes && typeof changes === 'object' && typeof changes.newData === 'object' && changes.newData)
            changes = changes.newData;
        const accountId = delta.account_id || delta.provider_account_id || delta.user_id || delta.provider_id;
        let applied = 0;
        if (accountId && Object.keys(changes).length) {
            const oldProf = await this.connection.collection('provider_profiles').findOne({ $or: [{ account_id: accountId }, { user_id: accountId }, { id: accountId }] });
            await this.purgeReplaced(oldProf, changes).catch(() => null);
            const res = await this.connection.collection('provider_profiles').updateOne({ $or: [{ account_id: accountId }, { user_id: accountId }, { id: accountId }] }, { $set: { ...changes, updated_at: new Date() } });
            applied = res.modifiedCount;
        }
        await this.connection.collection('provider_deltas').updateOne({ id }, { $set: { status: 'approved', reviewed_at: new Date(), applied_at: new Date() } });
        return { success: true, applied };
    }
    async rejectDelta(id) {
        const delta = await this.connection.collection('provider_deltas').findOne({ id });
        if (!delta)
            throw new common_1.NotFoundException('التغييرات المطلوبة غير موجودة');
        if (delta.status !== 'pending')
            throw new common_1.BadRequestException(`التغييرات تمت معالجتها مسبقاً (${delta.status})`);
        let changes = delta.requested_changes || delta.changes || {};
        if (changes && typeof changes === 'object' && typeof changes.changes === 'object' && changes.changes)
            changes = changes.changes;
        else if (changes && typeof changes === 'object' && typeof changes.newData === 'object' && changes.newData)
            changes = changes.newData;
        const accountId = delta.account_id || delta.provider_account_id || delta.user_id || delta.provider_id;
        try {
            const prof = accountId ? await this.connection.collection('provider_profiles').findOne({ $or: [{ account_id: accountId }, { user_id: accountId }, { id: accountId }] }) : null;
            const IMAGE_KEYS = ['profile_photo', 'logo', 'clinic_images', 'license_documents', 'images'];
            const toUrl = async (v) => {
                const s2 = String(v);
                if (s2.startsWith('http'))
                    return s2;
                const obj = await this.connection.collection('storage_objects').findOne({ id: s2 });
                return obj?.external_url || null;
            };
            for (const k of IMAGE_KEYS) {
                if (!changes || changes[k] === undefined)
                    continue;
                const newVals = Array.isArray(changes[k]) ? changes[k] : [changes[k]];
                const liveVals = new Set((Array.isArray(prof?.[k]) ? prof[k] : (prof?.[k] ? [prof[k]] : [])).map(String));
                for (const nv of newVals) {
                    if (liveVals.has(String(nv)))
                        continue;
                    const url = await toUrl(nv).catch(() => null);
                    if (url)
                        this.events.emit('storage.delete_by_url', { url });
                }
            }
        }
        catch { }
        await this.connection.collection('provider_deltas').updateOne({ id }, { $set: { status: 'rejected', reviewed_at: new Date() } });
        return { success: true };
    }
};
exports.ProviderModerationController = ProviderModerationController;
__decorate([
    (0, common_1.Post)('provider-deltas'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProviderModerationController.prototype, "getProviderDeltas", null);
__decorate([
    (0, common_1.Post)('provider-deltas/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProviderModerationController.prototype, "approveDelta", null);
__decorate([
    (0, common_1.Post)('provider-deltas/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProviderModerationController.prototype, "rejectDelta", null);
exports.ProviderModerationController = ProviderModerationController = __decorate([
    (0, common_1.Controller)('providers'),
    __param(0, (0, mongoose_1.InjectModel)(provider_schema_1.Provider.name)),
    __param(1, (0, mongoose_3.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], ProviderModerationController);
//# sourceMappingURL=provider-moderation.controller.js.map