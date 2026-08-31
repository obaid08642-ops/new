import { Model } from 'mongoose';
export declare class MedicalProgramEnrollment {
    id: string;
    account_id: string;
    program_type: string;
    title: string;
    duration?: string;
    completed_sessions: number;
    total_sessions: number;
    next_session?: {
        date?: string;
        time?: string;
        title?: string;
    };
    milestone_reward?: {
        label?: string;
        description?: string;
    };
    sessions: Array<{
        id: string;
        title?: string;
        completed_at?: Date;
    }>;
    status: string;
}
export declare const MedicalProgramEnrollmentSchema: import("mongoose").Schema<MedicalProgramEnrollment, Model<MedicalProgramEnrollment, any, any, any, import("mongoose").Document<unknown, any, MedicalProgramEnrollment, any, {}> & MedicalProgramEnrollment & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, MedicalProgramEnrollment, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<MedicalProgramEnrollment>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<MedicalProgramEnrollment> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
export declare class MedicalProgramsService {
    private readonly enrollments;
    constructor(enrollments: Model<any>);
    listActive(user: any): Promise<{
        id: any;
        title: any;
        duration: any;
        completedSessions: any;
        totalSessions: any;
        nextSessionDate: any;
        nextSessionTime: any;
        nextSessionTitle: any;
        milestoneReward: any;
        rewardDesc: any;
        sessionsList: any;
    }[]>;
    completeSession(user: any, body: {
        programType?: string;
        sessionId?: string;
    }): Promise<{
        id: any;
        title: any;
        duration: any;
        completedSessions: any;
        totalSessions: any;
        nextSessionDate: any;
        nextSessionTime: any;
        nextSessionTitle: any;
        milestoneReward: any;
        rewardDesc: any;
        sessionsList: any;
    }[]>;
}
export declare class MedicalProgramsController {
    private readonly svc;
    constructor(svc: MedicalProgramsService);
    active(user: any): Promise<{
        id: any;
        title: any;
        duration: any;
        completedSessions: any;
        totalSessions: any;
        nextSessionDate: any;
        nextSessionTime: any;
        nextSessionTitle: any;
        milestoneReward: any;
        rewardDesc: any;
        sessionsList: any;
    }[]>;
    complete(user: any, body: any): Promise<{
        id: any;
        title: any;
        duration: any;
        completedSessions: any;
        totalSessions: any;
        nextSessionDate: any;
        nextSessionTime: any;
        nextSessionTitle: any;
        milestoneReward: any;
        rewardDesc: any;
        sessionsList: any;
    }[]>;
}
export declare class MedicalProgramsModule {
}
