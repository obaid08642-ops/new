import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

@Schema({ _id: false })
export class CandidateExperience {
  @Prop({ required: true }) company: string;
  @Prop({ required: true }) role: string;
  @Prop({ required: true }) duration: string; // e.g. "2 years"
  @Prop() description?: string;
}
export const CandidateExperienceSchema = SchemaFactory.createForClass(CandidateExperience);

// 1. Candidate Profile Schema
@Schema({ timestamps: true, collection: 'candidate_profiles' })
export class CandidateProfile {
  @Prop({ default: () => uuid(), unique: true }) id: string;
  @Prop({ required: true, unique: true, index: true }) user_id: string; // FK to User
  @Prop({ required: true }) cv_url: string;
  @Prop({ type: [CandidateExperienceSchema], default: [] }) experiences: CandidateExperience[];
  @Prop({ required: true, index: true }) scfhs_license_number: string;
  @Prop({ required: true }) scfhs_license_status: string; // e.g. "Active", "Pending", "Expired"
  @Prop({ required: true }) scfhs_license_expiry: Date;
  @Prop({ type: [String], default: [] }) skills: string[];
  @Prop({ default: false }) is_deleted: boolean;
}
export type CandidateProfileDocument = CandidateProfile & Document;
export const CandidateProfileSchema = SchemaFactory.createForClass(CandidateProfile);

// 2. Job Posting Schema
@Schema({ timestamps: true, collection: 'job_postings' })
export class JobPosting {
  @Prop({ default: () => uuid(), unique: true }) id: string;
  @Prop({ required: true }) title: string;
  @Prop({ required: true }) description: string;
  @Prop({ type: [String], default: [] }) requirements: string[];
  @Prop({ required: true, index: true }) scfhs_role: string; // e.g. "GP", "Pharmacist", "Specialist Nurse"
  @Prop({ required: true }) location: string; // e.g. "Riyadh", "Jeddah"
  @Prop() salary_range?: string; // e.g. "15,000 - 20,000 SAR"
  @Prop({ required: true, index: true }) facility_id: string; // Owner organization
  @Prop({ type: String, enum: ['draft', 'published', 'closed'], default: 'draft', index: true })
  status: 'draft' | 'published' | 'closed';
  @Prop({ default: false, index: true }) is_deleted: boolean;
}
export type JobPostingDocument = JobPosting & Document;
export const JobPostingSchema = SchemaFactory.createForClass(JobPosting);

// 3. Job Application Schema
@Schema({ timestamps: true, collection: 'job_applications' })
export class JobApplication {
  @Prop({ default: () => uuid(), unique: true }) id: string;
  @Prop({ required: true, index: true }) job_id: string; // FK to JobPosting.id
  @Prop({ required: true, index: true }) candidate_id: string; // FK to CandidateProfile.id or User.id
  @Prop({ type: String, enum: ['submitted', 'under_review', 'interviewing', 'accepted', 'rejected'], default: 'submitted', index: true })
  status: 'submitted' | 'under_review' | 'interviewing' | 'accepted' | 'rejected';
  @Prop({ default: () => new Date() }) applied_at: Date;
  @Prop() cover_letter?: string;
  @Prop({ default: false }) is_deleted: boolean;
}
export type JobApplicationDocument = JobApplication & Document;
export const JobApplicationSchema = SchemaFactory.createForClass(JobApplication);
