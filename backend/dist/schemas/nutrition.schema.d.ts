import { Document } from 'mongoose';
export declare class NutritionProfile {
    patient_id: string;
    goal?: string;
    height_cm?: number;
    weight_kg?: number;
    target_weight_kg?: number;
    bmi?: number;
    body_fat_percent?: number;
    daily_calorie_target?: number;
    daily_water_target_ml?: number;
    activity_level?: string;
    dietary_restrictions: string[];
    allergies: string[];
}
export type NutritionProfileDocument = NutritionProfile & Document;
export declare const NutritionProfileSchema: import("mongoose").Schema<NutritionProfile, import("mongoose").Model<NutritionProfile, any, any, any, Document<unknown, any, NutritionProfile, any, {}> & NutritionProfile & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, NutritionProfile, Document<unknown, {}, import("mongoose").FlatRecord<NutritionProfile>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<NutritionProfile> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class MealLog {
    patient_id: string;
    name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    fiber_g: number;
    meal_type: string;
    image_url: string;
    logged_at: Date;
}
export type MealLogDocument = MealLog & Document;
export declare const MealLogSchema: import("mongoose").Schema<MealLog, import("mongoose").Model<MealLog, any, any, any, Document<unknown, any, MealLog, any, {}> & MealLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MealLog, Document<unknown, {}, import("mongoose").FlatRecord<MealLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MealLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class WaterLog {
    patient_id: string;
    amount_ml: number;
    logged_at: Date;
}
export type WaterLogDocument = WaterLog & Document;
export declare const WaterLogSchema: import("mongoose").Schema<WaterLog, import("mongoose").Model<WaterLog, any, any, any, Document<unknown, any, WaterLog, any, {}> & WaterLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, WaterLog, Document<unknown, {}, import("mongoose").FlatRecord<WaterLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<WaterLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class ExerciseLog {
    patient_id: string;
    name: string;
    duration_minutes: number;
    calories_burned: number;
    exercise_type: string;
    logged_at: Date;
}
export type ExerciseLogDocument = ExerciseLog & Document;
export declare const ExerciseLogSchema: import("mongoose").Schema<ExerciseLog, import("mongoose").Model<ExerciseLog, any, any, any, Document<unknown, any, ExerciseLog, any, {}> & ExerciseLog & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, ExerciseLog, Document<unknown, {}, import("mongoose").FlatRecord<ExerciseLog>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<ExerciseLog> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
