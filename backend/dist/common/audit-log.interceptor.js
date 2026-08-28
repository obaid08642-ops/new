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
exports.AuditLogInterceptor = exports.Audited = exports.AUDITED_KEY = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const operators_1 = require("rxjs/operators");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const security_module_1 = require("../modules/security/security.module");
exports.AUDITED_KEY = 'audited';
const Audited = (metadata) => (0, common_1.SetMetadata)(exports.AUDITED_KEY, metadata);
exports.Audited = Audited;
let AuditLogInterceptor = class AuditLogInterceptor {
    constructor(reflector, connection, auditService) {
        this.reflector = reflector;
        this.connection = connection;
        this.auditService = auditService;
    }
    async intercept(context, next) {
        const request = context.switchToHttp().getRequest();
        const handler = context.getHandler();
        const auditMeta = this.reflector.get(exports.AUDITED_KEY, handler);
        if (!auditMeta) {
            return next.handle();
        }
        const { model: modelName, idParam = 'id', action } = auditMeta;
        const reqId = request.params[idParam];
        let docBefore = null;
        let model = null;
        try {
            model = this.connection.model(modelName);
            if (reqId && model) {
                docBefore = await model.findOne({ id: reqId }).lean();
            }
        }
        catch (err) {
        }
        return next.handle().pipe((0, operators_1.tap)(async (data) => {
            try {
                const user = request.user;
                const ip = request.ip || request.headers['x-forwarded-for'] || request.socket.remoteAddress;
                const userAgent = request.headers['user-agent'];
                const correlationId = request.correlation_id;
                let docAfter = null;
                if (reqId && model) {
                    docAfter = await model.findOne({ id: reqId }).lean();
                }
                else if (model && data && data.id) {
                    docAfter = await model.findOne({ id: data.id }).lean();
                }
                const diff = this.calculateDiff(docBefore, docAfter);
                await this.auditService.write({
                    action: action || `${modelName.toLowerCase()}_modified`,
                    user_id: user?.id,
                    role: user?.role,
                    ip: typeof ip === 'string' ? ip : undefined,
                    user_agent: userAgent,
                    resource_kind: modelName,
                    resource_id: reqId || data?.id || docAfter?.id,
                    details: {
                        diff,
                        request_body: request.body,
                    },
                    severity: 'info',
                    correlation_id: correlationId,
                });
            }
            catch (err) {
            }
        }));
    }
    calculateDiff(before, after) {
        if (!before && !after)
            return null;
        const diff = {};
        if (!before && after) {
            for (const key of Object.keys(after)) {
                if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key))
                    continue;
                diff[key] = { old: null, new: after[key] };
            }
            return diff;
        }
        if (before && !after) {
            for (const key of Object.keys(before)) {
                if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key))
                    continue;
                diff[key] = { old: before[key], new: null };
            }
            return diff;
        }
        const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
        for (const key of allKeys) {
            if (['_id', '__v', 'createdAt', 'updatedAt'].includes(key))
                continue;
            const valBefore = before[key];
            const valAfter = after[key];
            if (JSON.stringify(valBefore) !== JSON.stringify(valAfter)) {
                diff[key] = { old: valBefore, new: valAfter };
            }
        }
        return Object.keys(diff).length > 0 ? diff : null;
    }
};
exports.AuditLogInterceptor = AuditLogInterceptor;
exports.AuditLogInterceptor = AuditLogInterceptor = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [core_1.Reflector,
        mongoose_2.Connection,
        security_module_1.AuditService])
], AuditLogInterceptor);
//# sourceMappingURL=audit-log.interceptor.js.map