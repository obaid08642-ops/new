import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

/* ───────────── Enums ───────────── */

export enum MoodValue {
  GREAT = 'great',
  GOOD = 'good',
  OKAY = 'okay',
  BAD = 'bad',
  TERRIBLE = 'terrible',
}

export const MOOD_SCORE_MAP: Record<MoodValue, number> = {
  [MoodValue.GREAT]: 5,
  [MoodValue.GOOD]: 4,
  [MoodValue.OKAY]: 3,
  [MoodValue.BAD]: 2,
  [MoodValue.TERRIBLE]: 1,
};

export enum MeditationType {
  GUIDED = 'guided',
  BREATHING = 'breathing',
  BODY_SCAN = 'body_scan',
  SLEEP = 'sleep',
  MINDFULNESS = 'mindfulness',
}

export enum BreathingTechnique {
  BOX_BREATHING = 'box_breathing',
  FOUR_SEVEN_EIGHT = '4_7_8',
  DIAPHRAGMATIC = 'diaphragmatic',
  EQUAL_BREATHING = 'equal_breathing',
}

export enum AssessmentType {
  PHQ9 = 'phq9',
  GAD7 = 'gad7',
  PSS = 'pss',
  GENERAL = 'general',
}

export enum Severity {
  MINIMAL = 'minimal',
  MILD = 'mild',
  MODERATE = 'moderate',
  MODERATELY_SEVERE = 'moderately_severe',
  SEVERE = 'severe',
}

/* ───────────── Sub-documents ───────────── */

@Schema({ _id: false })
export class AssessmentAnswer {
  @Prop({ required: true }) question: string;
  @Prop({ required: true }) answer: number;
}

/* ───────────── 1. MoodEntry ───────────── */

@Schema({ timestamps: true, collection: 'mood_entries' })
export class MoodEntry {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, enum: Object.values(MoodValue) }) mood: MoodValue;
  @Prop({ required: true, min: 1, max: 5 }) energy_level: number;
  @Prop({ required: true, min: 1, max: 5 }) stress_level: number;
  @Prop({ required: true, min: 0 }) sleep_hours: number;
  @Prop({ default: '' }) notes: string;
  @Prop({ type: [String], default: [] }) tags: string[];
  @Prop({ default: () => new Date() }) logged_at: Date;
}

export type MoodEntryDocument = MoodEntry & Document;
export const MoodEntrySchema = SchemaFactory.createForClass(MoodEntry);

/* ───────────── 2. MeditationSession ───────────── */

@Schema({ timestamps: true, collection: 'meditation_sessions' })
export class MeditationSession {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, enum: Object.values(MeditationType) }) type: MeditationType;
  @Prop({ required: true, min: 0 }) duration_minutes: number;
  @Prop({ default: false }) completed: boolean;
  @Prop({ default: () => new Date() }) logged_at: Date;
}

export type MeditationSessionDocument = MeditationSession & Document;
export const MeditationSessionSchema = SchemaFactory.createForClass(MeditationSession);

/* ───────────── 3. BreathingSession ───────────── */

@Schema({ timestamps: true, collection: 'breathing_sessions' })
export class BreathingSession {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, enum: Object.values(BreathingTechnique) }) technique: BreathingTechnique;
  @Prop({ required: true, min: 1 }) rounds: number;
  @Prop({ required: true, min: 0 }) duration_seconds: number;
  @Prop({ default: () => new Date() }) logged_at: Date;
}

export type BreathingSessionDocument = BreathingSession & Document;
export const BreathingSessionSchema = SchemaFactory.createForClass(BreathingSession);

/* ───────────── 4. SelfAssessment ───────────── */

@Schema({ timestamps: true, collection: 'self_assessments' })
export class SelfAssessment {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, enum: Object.values(AssessmentType) }) assessment_type: AssessmentType;
  @Prop({ required: true }) score: number;
  @Prop({ required: true }) max_score: number;
  @Prop({ required: true, enum: Object.values(Severity) }) severity: Severity;
  @Prop({ type: [AssessmentAnswer], default: [] }) answers: AssessmentAnswer[];
  @Prop({ default: () => new Date() }) completed_at: Date;
}

export type SelfAssessmentDocument = SelfAssessment & Document;
export const SelfAssessmentSchema = SchemaFactory.createForClass(SelfAssessment);

/* ───────────── 5. CrisisContact ───────────── */

@Schema({ timestamps: true, collection: 'crisis_contacts' })
export class CrisisContact {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true }) contact_name: string;
  @Prop({ required: true }) phone: string;
  @Prop({ default: '' }) relationship: string;
  @Prop({ default: false }) is_professional: boolean;
}

export type CrisisContactDocument = CrisisContact & Document;
export const CrisisContactSchema = SchemaFactory.createForClass(CrisisContact);
