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
exports.RecruitmentModule = exports.RecruitmentController = exports.RecruitmentService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const audit_log_interceptor_1 = require("../../common/audit-log.interceptor");
const enums_1 = require("../../common/enums");
const job_board_schema_1 = require("../../schemas/job-board.schema");
let RecruitmentService = class RecruitmentService {
    constructor(candidateModel, jobModel, appModel) {
        this.candidateModel = candidateModel;
        this.jobModel = jobModel;
        this.appModel = appModel;
    }
    async getOrCreateCandidateProfile(userId) {
        let profile = await this.candidateModel.findOne({ user_id: userId, is_deleted: false }).lean();
        return profile;
    }
    async upsertCandidateProfile(userId, dto) {
        const existing = await this.candidateModel.findOne({ user_id: userId });
        if (existing) {
            existing.cv_url = dto.cv_url ?? existing.cv_url;
            existing.experiences = dto.experiences ?? existing.experiences;
            existing.scfhs_license_number = dto.scfhs_license_number ?? existing.scfhs_license_number;
            existing.scfhs_license_status = dto.scfhs_license_status ?? existing.scfhs_license_status;
            existing.scfhs_license_expiry = dto.scfhs_license_expiry ? new Date(dto.scfhs_license_expiry) : existing.scfhs_license_expiry;
            existing.skills = dto.skills ?? existing.skills;
            existing.is_deleted = false;
            await existing.save();
            return existing.toObject();
        }
        else {
            if (!dto.cv_url || !dto.scfhs_license_number || !dto.scfhs_license_expiry) {
                throw new common_1.BadRequestException('cv_url, scfhs_license_number and scfhs_license_expiry are required for new profile');
            }
            const newProfile = await this.candidateModel.create({
                user_id: userId,
                cv_url: dto.cv_url,
                experiences: dto.experiences || [],
                scfhs_license_number: dto.scfhs_license_number,
                scfhs_license_status: dto.scfhs_license_status || 'Pending',
                scfhs_license_expiry: new Date(dto.scfhs_license_expiry),
                skills: dto.skills || [],
            });
            return newProfile.toObject();
        }
    }
    async createJob(userId, dto) {
        if (!dto.title || !dto.description || !dto.scfhs_role || !dto.location) {
            throw new common_1.BadRequestException('title, description, scfhs_role and location are required');
        }
        const newJob = await this.jobModel.create({
            title: dto.title,
            description: dto.description,
            requirements: dto.requirements || [],
            scfhs_role: dto.scfhs_role,
            location: dto.location,
            salary_range: dto.salary_range,
            facility_id: dto.facility_id || userId,
            status: dto.status || 'draft',
        });
        return newJob.toObject();
    }
    async updateJob(jobId, userId, userRole, dto) {
        const job = await this.jobModel.findOne({ id: jobId, is_deleted: false });
        if (!job)
            throw new common_1.NotFoundException('Job posting not found');
        if (job.facility_id !== userId && userRole !== enums_1.UserRole.ADMIN && userRole !== enums_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Not authorized to modify this job');
        }
        job.title = dto.title ?? job.title;
        job.description = dto.description ?? job.description;
        job.requirements = dto.requirements ?? job.requirements;
        job.scfhs_role = dto.scfhs_role ?? job.scfhs_role;
        job.location = dto.location ?? job.location;
        job.salary_range = dto.salary_range ?? job.salary_range;
        job.status = dto.status ?? job.status;
        await job.save();
        return job.toObject();
    }
    async listJobs(query, requester) {
        const filter = { is_deleted: false };
        if (query.location)
            filter.location = query.location;
        if (query.scfhs_role)
            filter.scfhs_role = query.scfhs_role;
        if (requester && [enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN].includes(requester.role)) {
            if (query.status)
                filter.status = query.status;
            if (query.facility_id)
                filter.facility_id = query.facility_id;
        }
        else if (requester && [enums_1.UserRole.HOSPITAL, enums_1.UserRole.DOCTOR].includes(requester.role)) {
            if (query.facility_id && query.facility_id === requester.id) {
                filter.facility_id = requester.id;
                if (query.status)
                    filter.status = query.status;
            }
            else {
                filter.status = 'published';
            }
        }
        else {
            filter.status = 'published';
        }
        return this.jobModel.find(filter).sort({ createdAt: -1 }).lean();
    }
    async getJob(id) {
        const job = await this.jobModel.findOne({ id, is_deleted: false }).lean();
        if (!job)
            throw new common_1.NotFoundException('Job posting not found');
        return job;
    }
    async softDeleteJob(jobId, userId, userRole) {
        const job = await this.jobModel.findOne({ id: jobId, is_deleted: false });
        if (!job)
            throw new common_1.NotFoundException('Job posting not found');
        if (job.facility_id !== userId && userRole !== enums_1.UserRole.ADMIN && userRole !== enums_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Not authorized to delete this job');
        }
        job.is_deleted = true;
        await job.save();
        return { success: true };
    }
    async applyForJob(userId, jobId, dto) {
        const candidate = await this.candidateModel.findOne({ user_id: userId, is_deleted: false }).lean();
        if (!candidate) {
            throw new common_1.BadRequestException('Candidate profile must be created before applying to jobs');
        }
        const job = await this.jobModel.findOne({ id: jobId, status: 'published', is_deleted: false }).lean();
        if (!job)
            throw new common_1.NotFoundException('Job posting not found or not open for applications');
        const existing = await this.appModel.findOne({ job_id: jobId, candidate_id: candidate.id, is_deleted: false }).lean();
        if (existing) {
            throw new common_1.BadRequestException('You have already applied for this job');
        }
        const app = await this.appModel.create({
            job_id: jobId,
            candidate_id: candidate.id,
            cover_letter: dto.cover_letter,
            applied_at: new Date(),
        });
        return app.toObject();
    }
    async listJobApplications(jobId, userId, userRole) {
        const job = await this.jobModel.findOne({ id: jobId, is_deleted: false }).lean();
        if (!job)
            throw new common_1.NotFoundException('Job posting not found');
        if (job.facility_id !== userId && userRole !== enums_1.UserRole.ADMIN && userRole !== enums_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Not authorized to view applications for this job');
        }
        const applications = await this.appModel.find({ job_id: jobId, is_deleted: false }).sort({ applied_at: -1 }).lean();
        const candidateIds = applications.map(a => a.candidate_id);
        const profiles = await this.candidateModel.find({ id: { $in: candidateIds } }).lean();
        const profileMap = new Map(profiles.map(p => [p.id, p]));
        return applications.map(app => ({
            ...app,
            candidate: profileMap.get(app.candidate_id) || null,
        }));
    }
    async getMyApplications(userId) {
        const candidate = await this.candidateModel.findOne({ user_id: userId, is_deleted: false }).lean();
        if (!candidate)
            return [];
        const applications = await this.appModel.find({ candidate_id: candidate.id, is_deleted: false }).sort({ applied_at: -1 }).lean();
        const jobIds = applications.map(a => a.job_id);
        const jobs = await this.jobModel.find({ id: { $in: jobIds } }).lean();
        const jobMap = new Map(jobs.map(j => [j.id, j]));
        return applications.map(app => ({
            ...app,
            job: jobMap.get(app.job_id) || null,
        }));
    }
    async updateApplicationStatus(appId, userId, userRole, status) {
        const app = await this.appModel.findOne({ id: appId, is_deleted: false });
        if (!app)
            throw new common_1.NotFoundException('Job application not found');
        const job = await this.jobModel.findOne({ id: app.job_id, is_deleted: false }).lean();
        if (!job)
            throw new common_1.NotFoundException('Associated job posting not found');
        if (job.facility_id !== userId && userRole !== enums_1.UserRole.ADMIN && userRole !== enums_1.UserRole.SUPER_ADMIN) {
            throw new common_1.ForbiddenException('Not authorized to modify this application');
        }
        if (!['submitted', 'under_review', 'interviewing', 'accepted', 'rejected'].includes(status)) {
            throw new common_1.BadRequestException('Invalid application status');
        }
        app.status = status;
        await app.save();
        return app.toObject();
    }
};
exports.RecruitmentService = RecruitmentService;
exports.RecruitmentService = RecruitmentService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('CandidateProfile')),
    __param(1, (0, mongoose_1.InjectModel)('JobPosting')),
    __param(2, (0, mongoose_1.InjectModel)('JobApplication')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], RecruitmentService);
let RecruitmentController = class RecruitmentController {
    constructor(svc) {
        this.svc = svc;
    }
    getCandidateProfile(u) {
        return this.svc.getOrCreateCandidateProfile(u.id);
    }
    upsertCandidateProfile(u, b) {
        return this.svc.upsertCandidateProfile(u.id, b);
    }
    getMyApplications(u) {
        return this.svc.getMyApplications(u.id);
    }
    createJob(u, b) {
        if (![enums_1.UserRole.HOSPITAL, enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN].includes(u.role)) {
            throw new common_1.ForbiddenException('Only hospitals and admin accounts can post jobs');
        }
        return this.svc.createJob(u.id, b);
    }
    updateJob(u, id, b) {
        return this.svc.updateJob(id, u.id, u.role, b);
    }
    listJobs(u, q) {
        return this.svc.listJobs(q, u);
    }
    getJob(id) {
        return this.svc.getJob(id);
    }
    applyForJob(u, id, b) {
        return this.svc.applyForJob(u.id, id, b);
    }
    listJobApplications(u, id) {
        return this.svc.listJobApplications(id, u.id, u.role);
    }
    updateApplicationStatus(u, id, b) {
        return this.svc.updateApplicationStatus(id, u.id, u.role, b.status);
    }
};
exports.RecruitmentController = RecruitmentController;
__decorate([
    (0, common_1.Get)('candidate/profile'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getCandidateProfile", null);
__decorate([
    (0, common_1.Post)('candidate/profile'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "upsertCandidateProfile", null);
__decorate([
    (0, common_1.Get)('applications/my'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getMyApplications", null);
__decorate([
    (0, common_1.Post)('jobs'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "createJob", null);
__decorate([
    (0, common_1.Put)('jobs/:id'),
    (0, audit_log_interceptor_1.Audited)({ model: 'JobPosting', idParam: 'id', action: 'job_posting_update' }),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateJob", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('jobs'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "listJobs", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('jobs/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "getJob", null);
__decorate([
    (0, common_1.Post)('jobs/:id/apply'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "applyForJob", null);
__decorate([
    (0, common_1.Get)('jobs/:id/applications'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "listJobApplications", null);
__decorate([
    (0, common_1.Patch)('applications/:id/status'),
    (0, audit_log_interceptor_1.Audited)({ model: 'JobApplication', idParam: 'id', action: 'job_application_status_update' }),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], RecruitmentController.prototype, "updateApplicationStatus", null);
exports.RecruitmentController = RecruitmentController = __decorate([
    (0, common_1.Controller)('recruitment'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [RecruitmentService])
], RecruitmentController);
let RecruitmentModule = class RecruitmentModule {
};
exports.RecruitmentModule = RecruitmentModule;
exports.RecruitmentModule = RecruitmentModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'CandidateProfile', schema: job_board_schema_1.CandidateProfileSchema },
                { name: 'JobPosting', schema: job_board_schema_1.JobPostingSchema },
                { name: 'JobApplication', schema: job_board_schema_1.JobApplicationSchema },
            ]),
        ],
        controllers: [RecruitmentController],
        providers: [RecruitmentService],
        exports: [RecruitmentService],
    })
], RecruitmentModule);
//# sourceMappingURL=recruitment.module.js.map