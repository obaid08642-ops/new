import { Model } from 'mongoose';
export declare class RecruitmentService {
    private candidateModel;
    private jobModel;
    private appModel;
    constructor(candidateModel: Model<any>, jobModel: Model<any>, appModel: Model<any>);
    getOrCreateCandidateProfile(userId: string): Promise<any>;
    upsertCandidateProfile(userId: string, dto: any): Promise<any>;
    createJob(userId: string, dto: any): Promise<any>;
    updateJob(jobId: string, userId: string, userRole: string, dto: any): Promise<any>;
    listJobs(query: {
        location?: string;
        scfhs_role?: string;
        status?: string;
        facility_id?: string;
    }, requester: any): Promise<any[]>;
    getJob(id: string): Promise<any>;
    softDeleteJob(jobId: string, userId: string, userRole: string): Promise<any>;
    applyForJob(userId: string, jobId: string, dto: any): Promise<any>;
    listJobApplications(jobId: string, userId: string, userRole: string): Promise<any[]>;
    getMyApplications(userId: string): Promise<any[]>;
    updateApplicationStatus(appId: string, userId: string, userRole: string, status: string): Promise<any>;
}
export declare class RecruitmentController {
    private svc;
    constructor(svc: RecruitmentService);
    getCandidateProfile(u: any): Promise<any>;
    upsertCandidateProfile(u: any, b: any): Promise<any>;
    getMyApplications(u: any): Promise<any[]>;
    createJob(u: any, b: any): Promise<any>;
    updateJob(u: any, id: string, b: any): Promise<any>;
    listJobs(u: any, q: any): Promise<any[]>;
    getJob(id: string): Promise<any>;
    applyForJob(u: any, id: string, b: any): Promise<any>;
    listJobApplications(u: any, id: string): Promise<any[]>;
    updateApplicationStatus(u: any, id: string, b: {
        status: string;
    }): Promise<any>;
}
export declare class RecruitmentModule {
}
