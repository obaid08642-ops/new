import { Connection } from 'mongoose';
import { SupportRequestRepository } from "./repositories/supportrequest.repository";
import { PatientSettingsRepository } from "./repositories/patientsettings.repository";
export declare class SupportService {
    private readonly req;
    private readonly settings;
    private readonly conn;
    constructor(req: SupportRequestRepository, settings: PatientSettingsRepository, conn: Connection);
    create(user: any, body: any): Promise<any>;
    mine(user: any): Promise<any>;
    getOne(user: any, id: string): Promise<any>;
    reply(user: any, id: string, message: string): Promise<any>;
    adminList(status?: string): Promise<any>;
    adminUpdateStatus(id: string, status: string, assigned_to: string): Promise<any>;
    listTickets(user_id: string): Promise<any>;
    getSettings(user: any): Promise<any>;
    updateSettings(user: any, body: any): Promise<any>;
    getFaqs(): Promise<{
        id: string;
        question: string;
        answer: string;
    }[]>;
    submitFeedback(user_id: string, body: any): Promise<{
        success: boolean;
        message: string;
    }>;
}
