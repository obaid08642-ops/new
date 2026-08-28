import { Document } from 'mongoose';
export declare enum MoodValue {
    GREAT = "great",
    GOOD = "good",
    OKAY = "okay",
    BAD = "bad",
    TERRIBLE = "terrible"
}
export declare const MOOD_SCORE_MAP: Record<MoodValue, number>;
export declare enum MeditationType {
    GUIDED = "guided",
    BREATHING = "breathing",
    BODY_SCAN = "body_scan",
    SLEEP = "sleep",
    MINDFULNESS = "mindfulness"
}
export declare enum BreathingTechnique {
    BOX_BREATHING = "box_breathing",
    FOUR_SEVEN_EIGHT = "4_7_8",
    DIAPHRAGMATIC = "diaphragmatic",
    EQUAL_BREATHING = "equal_breathing"
}
export declare class MoodEntry {
    id: string;
    patient_id: string;
    mood: MoodValue;
    energy_level?: number;
    stress_level?: number;
    sleep_hours?: number;
    notes?: string;
    tags: string[];
    logged_at: Date;
}
export type MoodEntryDocument = MoodEntry & Document;
export declare const MoodEntrySchema: import("mongoose").Schema<MoodEntry, import("mongoose").Model<MoodEntry, any, any, any, Document<unknown, any, MoodEntry, any, {}> & MoodEntry & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MoodEntry, Document<unknown, {}, import("mongoose").FlatRecord<MoodEntry>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MoodEntry> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class MeditationSession {
    id: string;
    patient_id: string;
    type: MeditationType;
    duration_minutes: number;
    completed: boolean;
    logged_at: Date;
}
export type MeditationSessionDocument = MeditationSession & Document;
export declare const MeditationSessionSchema: import("mongoose").Schema<MeditationSession, import("mongoose").Model<MeditationSession, any, any, any, Document<unknown, any, MeditationSession, any, {}> & MeditationSession & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MeditationSession, Document<unknown, {}, import("mongoose").FlatRecord<MeditationSession>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MeditationSession> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class BreathingSession {
    id: string;
    patient_id: string;
    technique: BreathingTechnique;
    rounds: number;
    duration_seconds: number;
    logged_at: Date;
}
export type BreathingSessionDocument = BreathingSession & Document;
export declare const BreathingSessionSchema: import("mongoose").Schema<BreathingSession, import("mongoose").Model<BreathingSession, any, any, any, Document<unknown, any, BreathingSession, any, {}> & BreathingSession & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, BreathingSession, Document<unknown, {}, import("mongoose").FlatRecord<BreathingSession>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<BreathingSession> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class CrisisContact {
    id: string;
    patient_id: string;
    contact_name: string;
    phone: string;
    relationship?: string;
    is_professional: boolean;
}
export type CrisisContactDocument = CrisisContact & Document;
export declare const CrisisContactSchema: import("mongoose").Schema<CrisisContact, import("mongoose").Model<CrisisContact, any, any, any, Document<unknown, any, CrisisContact, any, {}> & CrisisContact & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, CrisisContact, Document<unknown, {}, import("mongoose").FlatRecord<CrisisContact>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<CrisisContact> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
