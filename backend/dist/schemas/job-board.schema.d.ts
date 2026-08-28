import { Document } from 'mongoose';
export declare class CandidateExperience {
    company: string;
    role: string;
    duration: string;
    description?: string;
}
export declare const CandidateExperienceSchema: import("mongoose").Schema<CandidateExperience, import("mongoose").Model<CandidateExperience, any, any, any, Document<unknown, any, CandidateExperience, any, {}> & CandidateExperience & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CandidateExperience, Document<unknown, {}, import("mongoose").FlatRecord<CandidateExperience>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CandidateExperience> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class CandidateProfile {
    id: string;
    user_id: string;
    cv_url: string;
    experiences: CandidateExperience[];
    scfhs_license_number: string;
    scfhs_license_status: string;
    scfhs_license_expiry: Date;
    skills: string[];
    is_deleted: boolean;
}
export type CandidateProfileDocument = CandidateProfile & Document;
export declare const CandidateProfileSchema: import("mongoose").Schema<CandidateProfile, import("mongoose").Model<CandidateProfile, any, any, any, Document<unknown, any, CandidateProfile, any, {}> & CandidateProfile & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CandidateProfile, Document<unknown, {}, import("mongoose").FlatRecord<CandidateProfile>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CandidateProfile> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class JobPosting {
    id: string;
    title: string;
    description: string;
    requirements: string[];
    scfhs_role: string;
    location: string;
    salary_range?: string;
    facility_id: string;
    status: 'draft' | 'published' | 'closed';
    is_deleted: boolean;
}
export type JobPostingDocument = JobPosting & Document;
export declare const JobPostingSchema: import("mongoose").Schema<JobPosting, import("mongoose").Model<JobPosting, any, any, any, Document<unknown, any, JobPosting, any, {}> & JobPosting & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, JobPosting, Document<unknown, {}, import("mongoose").FlatRecord<JobPosting>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<JobPosting> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class JobApplication {
    id: string;
    job_id: string;
    candidate_id: string;
    status: 'submitted' | 'under_review' | 'interviewing' | 'accepted' | 'rejected';
    applied_at: Date;
    cover_letter?: string;
    is_deleted: boolean;
}
export type JobApplicationDocument = JobApplication & Document;
export declare const JobApplicationSchema: import("mongoose").Schema<JobApplication, import("mongoose").Model<JobApplication, any, any, any, Document<unknown, any, JobApplication, any, {}> & JobApplication & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, JobApplication, Document<unknown, {}, import("mongoose").FlatRecord<JobApplication>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<JobApplication> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
