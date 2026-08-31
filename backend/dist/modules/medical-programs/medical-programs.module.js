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
exports.MedicalProgramsModule = exports.MedicalProgramsController = exports.MedicalProgramsService = exports.MedicalProgramEnrollmentSchema = exports.MedicalProgramEnrollment = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const common_2 = require("@nestjs/common");
const common_3 = require("@nestjs/common");
const mongoose_2 = require("@nestjs/mongoose");
const mongoose_3 = require("mongoose");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../common/auth.guard");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const common_4 = require("@nestjs/common");
let MedicalProgramEnrollment = class MedicalProgramEnrollment {
};
exports.MedicalProgramEnrollment = MedicalProgramEnrollment;
__decorate([
    (0, mongoose_2.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], MedicalProgramEnrollment.prototype, "id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MedicalProgramEnrollment.prototype, "account_id", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], MedicalProgramEnrollment.prototype, "program_type", void 0);
__decorate([
    (0, mongoose_2.Prop)({ required: true }),
    __metadata("design:type", String)
], MedicalProgramEnrollment.prototype, "title", void 0);
__decorate([
    (0, mongoose_2.Prop)(),
    __metadata("design:type", String)
], MedicalProgramEnrollment.prototype, "duration", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MedicalProgramEnrollment.prototype, "completed_sessions", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MedicalProgramEnrollment.prototype, "total_sessions", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: Object }),
    __metadata("design:type", Object)
], MedicalProgramEnrollment.prototype, "next_session", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: Object }),
    __metadata("design:type", Object)
], MedicalProgramEnrollment.prototype, "milestone_reward", void 0);
__decorate([
    (0, mongoose_2.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], MedicalProgramEnrollment.prototype, "sessions", void 0);
__decorate([
    (0, mongoose_2.Prop)({ default: 'active', enum: ['active', 'completed', 'cancelled'], index: true }),
    __metadata("design:type", String)
], MedicalProgramEnrollment.prototype, "status", void 0);
exports.MedicalProgramEnrollment = MedicalProgramEnrollment = __decorate([
    (0, mongoose_2.Schema)({ timestamps: true, collection: 'medical_program_enrollments' })
], MedicalProgramEnrollment);
exports.MedicalProgramEnrollmentSchema = mongoose_2.SchemaFactory.createForClass(MedicalProgramEnrollment);
exports.MedicalProgramEnrollmentSchema.index({ account_id: 1, status: 1 });
let MedicalProgramsService = class MedicalProgramsService {
    constructor(enrollments) {
        this.enrollments = enrollments;
    }
    async listActive(user) {
        if (!user?.id)
            throw new common_2.BadRequestException('patient_identity_required');
        const docs = await this.enrollments.find({ account_id: user.id, status: 'active' }).lean();
        return docs.map((d) => ({
            id: d.program_type,
            title: d.title,
            duration: d.duration || null,
            completedSessions: d.completed_sessions || 0,
            totalSessions: d.total_sessions || 0,
            nextSessionDate: d.next_session?.date || null,
            nextSessionTime: d.next_session?.time || null,
            nextSessionTitle: d.next_session?.title || null,
            milestoneReward: d.milestone_reward?.label || null,
            rewardDesc: d.milestone_reward?.description || null,
            sessionsList: d.sessions || [],
        }));
    }
    async completeSession(user, body) {
        if (!user?.id)
            throw new common_2.BadRequestException('patient_identity_required');
        const programType = String(body?.programType || '').trim();
        const sessionId = String(body?.sessionId || '').trim();
        if (!programType || !sessionId)
            throw new common_2.BadRequestException('program_and_session_required');
        const doc = await this.enrollments.findOne({ account_id: user.id, program_type: programType, status: 'active' });
        if (!doc)
            throw new common_2.BadRequestException('program_enrollment_not_found');
        const sessions = Array.isArray(doc.sessions) ? doc.sessions : [];
        const session = sessions.find((s) => String(s.id) === sessionId);
        if (!session)
            throw new common_2.BadRequestException('session_not_found');
        if (!session.completed_at) {
            session.completed_at = new Date();
            doc.sessions = sessions;
            doc.completed_sessions = sessions.filter((s) => s.completed_at).length;
            if (doc.total_sessions > 0 && doc.completed_sessions >= doc.total_sessions)
                doc.status = 'completed';
            doc.markModified('sessions');
            await doc.save();
        }
        return this.listActive(user);
    }
};
exports.MedicalProgramsService = MedicalProgramsService;
exports.MedicalProgramsService = MedicalProgramsService = __decorate([
    (0, common_3.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('MedicalProgramEnrollment')),
    __metadata("design:paramtypes", [mongoose_3.Model])
], MedicalProgramsService);
let MedicalProgramsController = class MedicalProgramsController {
    constructor(svc) {
        this.svc = svc;
    }
    active(user) { return this.svc.listActive(user); }
    complete(user, body) { return this.svc.completeSession(user, body); }
};
exports.MedicalProgramsController = MedicalProgramsController;
__decorate([
    (0, common_2.Get)('active'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MedicalProgramsController.prototype, "active", null);
__decorate([
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    (0, common_2.Post)('complete-session'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_2.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MedicalProgramsController.prototype, "complete", null);
exports.MedicalProgramsController = MedicalProgramsController = __decorate([
    (0, common_2.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_4.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    (0, common_2.Controller)('medical/programs'),
    __metadata("design:paramtypes", [MedicalProgramsService])
], MedicalProgramsController);
let MedicalProgramsModule = class MedicalProgramsModule {
};
exports.MedicalProgramsModule = MedicalProgramsModule;
exports.MedicalProgramsModule = MedicalProgramsModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: 'MedicalProgramEnrollment', schema: exports.MedicalProgramEnrollmentSchema }])],
        controllers: [MedicalProgramsController],
        providers: [MedicalProgramsService],
    })
], MedicalProgramsModule);
//# sourceMappingURL=medical-programs.module.js.map