import { Module, Controller, Get, Post, Put, Patch, Param, Query, Body, UseGuards, Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Audited } from '../../common/audit-log.interceptor';
import { UserRole } from '../../common/enums';
import { CandidateProfile, CandidateProfileSchema, JobPosting, JobPostingSchema, JobApplication, JobApplicationSchema } from '../../schemas/job-board.schema';

@Injectable()
export class RecruitmentService {
  constructor(
    @InjectModel('CandidateProfile') private candidateModel: Model<any>,
    @InjectModel('JobPosting') private jobModel: Model<any>,
    @InjectModel('JobApplication') private appModel: Model<any>,
  ) {}

  // --- Candidate Profile ---
  async getOrCreateCandidateProfile(userId: string): Promise<any> {
    let profile = await this.candidateModel.findOne({ user_id: userId, is_deleted: false }).lean();
    return profile;
  }

  async upsertCandidateProfile(userId: string, dto: any): Promise<any> {
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
    } else {
      if (!dto.cv_url || !dto.scfhs_license_number || !dto.scfhs_license_expiry) {
        throw new BadRequestException('cv_url, scfhs_license_number and scfhs_license_expiry are required for new profile');
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

  // --- Job Posting ---
  async createJob(userId: string, dto: any): Promise<any> {
    if (!dto.title || !dto.description || !dto.scfhs_role || !dto.location) {
      throw new BadRequestException('title, description, scfhs_role and location are required');
    }
    const newJob = await this.jobModel.create({
      title: dto.title,
      description: dto.description,
      requirements: dto.requirements || [],
      scfhs_role: dto.scfhs_role,
      location: dto.location,
      salary_range: dto.salary_range,
      facility_id: dto.facility_id || userId, // set facility_id to creator if not provided
      status: dto.status || 'draft',
    });
    return newJob.toObject();
  }

  async updateJob(jobId: string, userId: string, userRole: string, dto: any): Promise<any> {
    const job = await this.jobModel.findOne({ id: jobId, is_deleted: false });
    if (!job) throw new NotFoundException('Job posting not found');

    // Only creator (facility_id) or admin can edit
    if (job.facility_id !== userId && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Not authorized to modify this job');
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

  async listJobs(query: { location?: string; scfhs_role?: string; status?: string; facility_id?: string }, requester: any): Promise<any[]> {
    const filter: any = { is_deleted: false };
    if (query.location) filter.location = query.location;
    if (query.scfhs_role) filter.scfhs_role = query.scfhs_role;
    
    // Status logic: general users can only see 'published'
    if (requester && [UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(requester.role as UserRole)) {
      if (query.status) filter.status = query.status;
      if (query.facility_id) filter.facility_id = query.facility_id;
    } else if (requester && [UserRole.HOSPITAL, UserRole.DOCTOR].includes(requester.role as UserRole)) {
      // Facilities can see their own jobs in any status
      if (query.facility_id && query.facility_id === requester.id) {
        filter.facility_id = requester.id;
        if (query.status) filter.status = query.status;
      } else {
        filter.status = 'published';
      }
    } else {
      filter.status = 'published';
    }

    return this.jobModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async getJob(id: string): Promise<any> {
    const job = await this.jobModel.findOne({ id, is_deleted: false }).lean();
    if (!job) throw new NotFoundException('Job posting not found');
    return job;
  }

  async softDeleteJob(jobId: string, userId: string, userRole: string): Promise<any> {
    const job = await this.jobModel.findOne({ id: jobId, is_deleted: false });
    if (!job) throw new NotFoundException('Job posting not found');

    if (job.facility_id !== userId && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Not authorized to delete this job');
    }

    job.is_deleted = true;
    await job.save();
    return { success: true };
  }

  // --- Job Application ---
  async applyForJob(userId: string, jobId: string, dto: any): Promise<any> {
    // 1. Verify candidate profile exists
    const candidate = await this.candidateModel.findOne({ user_id: userId, is_deleted: false }).lean();
    if (!candidate) {
      throw new BadRequestException('Candidate profile must be created before applying to jobs');
    }

    // 2. Verify job is published
    const job = await this.jobModel.findOne({ id: jobId, status: 'published', is_deleted: false }).lean();
    if (!job) throw new NotFoundException('Job posting not found or not open for applications');

    // 3. Verify not already applied
    const existing = await this.appModel.findOne({ job_id: jobId, candidate_id: (candidate as any).id, is_deleted: false }).lean();
    if (existing) {
      throw new BadRequestException('You have already applied for this job');
    }

    // 4. Create application
    const app = await this.appModel.create({
      job_id: jobId,
      candidate_id: (candidate as any).id,
      cover_letter: dto.cover_letter,
      applied_at: new Date(),
    });

    return app.toObject();
  }

  async listJobApplications(jobId: string, userId: string, userRole: string): Promise<any[]> {
    // Verify job belongs to user or user is admin
    const job = await this.jobModel.findOne({ id: jobId, is_deleted: false }).lean();
    if (!job) throw new NotFoundException('Job posting not found');

    if ((job as any).facility_id !== userId && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Not authorized to view applications for this job');
    }

    const applications = await this.appModel.find({ job_id: jobId, is_deleted: false }).sort({ applied_at: -1 }).lean();
    
    // Enrich with candidate profile details
    const candidateIds = applications.map(a => a.candidate_id);
    const profiles = await this.candidateModel.find({ id: { $in: candidateIds } }).lean();
    const profileMap = new Map<string, any>(profiles.map(p => [p.id, p]));

    return applications.map(app => ({
      ...app,
      candidate: profileMap.get(app.candidate_id) || null,
    }));
  }

  async getMyApplications(userId: string): Promise<any[]> {
    const candidate = await this.candidateModel.findOne({ user_id: userId, is_deleted: false }).lean();
    if (!candidate) return [];

    const applications = await this.appModel.find({ candidate_id: (candidate as any).id, is_deleted: false }).sort({ applied_at: -1 }).lean();
    const jobIds = applications.map(a => a.job_id);
    const jobs = await this.jobModel.find({ id: { $in: jobIds } }).lean();
    const jobMap = new Map<string, any>(jobs.map(j => [j.id, j]));

    return applications.map(app => ({
      ...app,
      job: jobMap.get(app.job_id) || null,
    }));
  }

  async updateApplicationStatus(appId: string, userId: string, userRole: string, status: string): Promise<any> {
    const app = await this.appModel.findOne({ id: appId, is_deleted: false });
    if (!app) throw new NotFoundException('Job application not found');

    const job = await this.jobModel.findOne({ id: app.job_id, is_deleted: false }).lean();
    if (!job) throw new NotFoundException('Associated job posting not found');

    if ((job as any).facility_id !== userId && userRole !== UserRole.ADMIN && userRole !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Not authorized to modify this application');
    }

    if (!['submitted', 'under_review', 'interviewing', 'accepted', 'rejected'].includes(status)) {
      throw new BadRequestException('Invalid application status');
    }

    app.status = status as any;
    await app.save();
    return app.toObject();
  }
}

@Controller('recruitment')
@UseGuards(JwtAuthGuard)
export class RecruitmentController {
  constructor(private svc: RecruitmentService) {}

  // --- Candidate endpoints ---
  @Get('candidate/profile')
  getCandidateProfile(@CurrentUser() u: any) {
    return this.svc.getOrCreateCandidateProfile(u.id);
  }

  @Post('candidate/profile')
  upsertCandidateProfile(@CurrentUser() u: any, @Body() b: any) {
    return this.svc.upsertCandidateProfile(u.id, b);
  }

  @Get('applications/my')
  getMyApplications(@CurrentUser() u: any) {
    return this.svc.getMyApplications(u.id);
  }

  // --- Job Posting endpoints ---
  @Post('jobs')
  createJob(@CurrentUser() u: any, @Body() b: any) {
    // Only hospital, clinic, admin can create jobs
    if (![UserRole.HOSPITAL, UserRole.ADMIN, UserRole.SUPER_ADMIN].includes(u.role as UserRole)) {
      throw new ForbiddenException('Only hospitals and admin accounts can post jobs');
    }
    return this.svc.createJob(u.id, b);
  }

  @Put('jobs/:id')
  @Audited({ model: 'JobPosting', idParam: 'id', action: 'job_posting_update' })
  updateJob(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.updateJob(id, u.id, u.role, b);
  }

  @Get('jobs')
  listJobs(@CurrentUser() u: any, @Query() q: any) {
    return this.svc.listJobs(q, u);
  }

  @Get('jobs/:id')
  getJob(@Param('id') id: string) {
    return this.svc.getJob(id);
  }

  @Post('jobs/:id/apply')
  applyForJob(@CurrentUser() u: any, @Param('id') id: string, @Body() b: any) {
    return this.svc.applyForJob(u.id, id, b);
  }

  @Get('jobs/:id/applications')
  listJobApplications(@CurrentUser() u: any, @Param('id') id: string) {
    return this.svc.listJobApplications(id, u.id, u.role);
  }

  @Patch('applications/:id/status')
  @Audited({ model: 'JobApplication', idParam: 'id', action: 'job_application_status_update' })
  updateApplicationStatus(@CurrentUser() u: any, @Param('id') id: string, @Body() b: { status: string }) {
    return this.svc.updateApplicationStatus(id, u.id, u.role, b.status);
  }
}

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'CandidateProfile', schema: CandidateProfileSchema },
      { name: 'JobPosting', schema: JobPostingSchema },
      { name: 'JobApplication', schema: JobApplicationSchema },
    ]),
  ],
  controllers: [RecruitmentController],
  providers: [RecruitmentService],
  exports: [RecruitmentService],
})
export class RecruitmentModule {}
