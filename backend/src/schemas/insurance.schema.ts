import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

// Subdocument for Doctor/Facility contracts
@Schema({ _id: false })
export class InsuranceNetworkContract {
  @Prop({ required: true, index: true }) company_id: string; // FK to InsuranceCompany.id
  @Prop({ required: true }) company_name_ar: string;
  @Prop({ required: true }) company_name_en: string;
  @Prop({ required: true, index: true }) network_id: string; // FK to InsuranceNetwork.id
  @Prop({ required: true }) network_name_ar: string;
  @Prop({ required: true }) network_name_en: string;
  @Prop({ type: [String], default: [] }) covered_classes: string[]; // ['A', 'B', 'VIP']
  @Prop({ default: 0 }) copay_percent: number; // e.g. 10 = 10% copay
  @Prop({ default: 0 }) copay_flat: number; // e.g. 20 = 20 SAR copay
}
export const InsuranceNetworkContractSchema = SchemaFactory.createForClass(InsuranceNetworkContract);

// 1. Insurance Company Schema
@Schema({ timestamps: true, collection: 'insurance_companies' })
export class InsuranceCompany {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, unique: true }) code: string; // e.g., 'bupa', 'tawuniya'
  @Prop({ required: true }) name_ar: string;
  @Prop({ required: true }) name_en: string;
  @Prop() logo_url?: string;
  @Prop({ default: true }) is_active: boolean;
}
export type InsuranceCompanyDocument = InsuranceCompany & Document;
export const InsuranceCompanySchema = SchemaFactory.createForClass(InsuranceCompany);

// 2. Insurance Network Schema
@Schema({ timestamps: true, collection: 'insurance_networks' })
export class InsuranceNetwork {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) company_id: string;
  @Prop({ required: true }) code: string; // e.g., 'gold', 'silver'
  @Prop({ required: true }) name_ar: string;
  @Prop({ required: true }) name_en: string;
  @Prop({ default: 1 }) tier_level: number;
}
export type InsuranceNetworkDocument = InsuranceNetwork & Document;
export const InsuranceNetworkSchema = SchemaFactory.createForClass(InsuranceNetwork);

// 3. Coverage Rules Schema
@Schema({ timestamps: true, collection: 'insurance_coverage_rules' })
export class CoverageRule {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) network_id: string;
  @Prop({ required: true }) service_type: string; // consultation, pharmacy, lab, radiology, nursing
  @Prop() service_key?: string; // specific service code or specialty (e.g. 'cardiology', 'cbc-test')
  @Prop({ default: 0 }) copay_percent: number;
  @Prop({ default: 0 }) copay_flat_limit: number;
  @Prop({ default: false }) requires_preauth: boolean;
  @Prop() max_annual_limit?: number;
}
export type CoverageRuleDocument = CoverageRule & Document;
export const CoverageRuleSchema = SchemaFactory.createForClass(CoverageRule);

// 4. Insurance Claim Schema
@Schema({ timestamps: true, collection: 'insurance_claims' })
export class InsuranceClaim {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) service: string;
  @Prop({ required: true }) amount: number;
  @Prop({ required: true }) covered: number;
  @Prop({ required: true, enum: ['approved', 'reimbursed', 'pending', 'rejected'], default: 'pending' }) status: string;
  @Prop() date: string;
}
export type InsuranceClaimDocument = InsuranceClaim & Document;
export const InsuranceClaimSchema = SchemaFactory.createForClass(InsuranceClaim);

@Schema({ _id: false })
export class InsuranceDetails {
  @Prop() policyNumber: string;
  @Prop() memberId: string;
  @Prop() approvalReferenceNumber?: string;
  @Prop({ type: String, enum: ['PENDING_PROVIDER_REVIEW', 'SUBMITTED_TO_INSURANCE', 'APPROVED', 'PARTIALLY_APPROVED', 'REJECTED'], default: 'PENDING_PROVIDER_REVIEW', index: true })
  approvalStatus: string;
  @Prop() approvalDate?: Date;
  @Prop() approvedBy?: string;
  @Prop() coveredAmount?: number;
  @Prop() copayAmount?: number;
  @Prop() coveragePercentage?: number;
  @Prop() patientCopayPercentage?: number;
  @Prop() insuranceCompanyShare?: number;
  @Prop() patientShare?: number;
  @Prop() rejectionReason?: string;
}
export const InsuranceDetailsSchema = SchemaFactory.createForClass(InsuranceDetails);
