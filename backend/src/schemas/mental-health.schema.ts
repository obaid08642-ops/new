import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuid } from 'uuid';

/* ───────────── Shared values ───────────── */

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

/* ───────────── Patient-owned wellbeing records ───────────── */

@Schema({ timestamps: true, collection: 'mood_entries' })
export class MoodEntry {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, enum: Object.values(MoodValue) }) mood: MoodValue;
  @Prop({ min: 1, max: 5 }) energy_level?: number;
  @Prop({ min: 1, max: 5 }) stress_level?: number;
  @Prop({ min: 0, max: 24 }) sleep_hours?: number;
  @Prop({ trim: true, maxlength: 500 }) notes?: string;
  @Prop({ type: [String], default: [] }) tags: string[];
  @Prop({ required: true, default: () => new Date() }) logged_at: Date;
}

export type MoodEntryDocument = MoodEntry & Document;
export const MoodEntrySchema = SchemaFactory.createForClass(MoodEntry);
MoodEntrySchema.index({ patient_id: 1, logged_at: -1 });

@Schema({ timestamps: true, collection: 'meditation_sessions' })
export class MeditationSession {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, enum: Object.values(MeditationType) }) type: MeditationType;
  @Prop({ required: true, min: 1, max: 180 }) duration_minutes: number;
  @Prop({ default: false }) completed: boolean;
  @Prop({ required: true, default: () => new Date() }) logged_at: Date;
}

export type MeditationSessionDocument = MeditationSession & Document;
export const MeditationSessionSchema = SchemaFactory.createForClass(MeditationSession);
MeditationSessionSchema.index({ patient_id: 1, logged_at: -1 });

@Schema({ timestamps: true, collection: 'breathing_sessions' })
export class BreathingSession {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, enum: Object.values(BreathingTechnique) }) technique: BreathingTechnique;
  @Prop({ required: true, min: 1, max: 100 }) rounds: number;
  @Prop({ required: true, min: 1, max: 7200 }) duration_seconds: number;
  @Prop({ required: true, default: () => new Date() }) logged_at: Date;
}

export type BreathingSessionDocument = BreathingSession & Document;
export const BreathingSessionSchema = SchemaFactory.createForClass(BreathingSession);
BreathingSessionSchema.index({ patient_id: 1, logged_at: -1 });

@Schema({ timestamps: true, collection: 'crisis_contacts' })
export class CrisisContact {
  @Prop({ default: () => uuid() }) id: string;
  @Prop({ required: true, index: true }) patient_id: string;
  @Prop({ required: true, trim: true, maxlength: 80 }) contact_name: string;
  @Prop({ required: true, trim: true, maxlength: 30 }) phone: string;
  @Prop({ trim: true, maxlength: 80 }) relationship?: string;
  @Prop({ default: false }) is_professional: boolean;
}

export type CrisisContactDocument = CrisisContact & Document;
export const CrisisContactSchema = SchemaFactory.createForClass(CrisisContact);
CrisisContactSchema.index({ patient_id: 1, createdAt: -1 });
