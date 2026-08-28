import { Document } from 'mongoose';
export type TreatmentProgramDocument = TreatmentProgram & Document;
export declare class TreatmentProgram {
    id: string;
    patientId: string;
    programType: 'diabetes' | 'hypertension' | 'pregnancy';
    status: 'active' | 'completed';
    completedSteps: string[];
    nextSchedule: Date;
}
export declare const TreatmentProgramSchema: import("mongoose").Schema<TreatmentProgram, import("mongoose").Model<TreatmentProgram, any, any, any, Document<unknown, any, TreatmentProgram, any, {}> & TreatmentProgram & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, TreatmentProgram, Document<unknown, {}, import("mongoose").FlatRecord<TreatmentProgram>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<TreatmentProgram> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
