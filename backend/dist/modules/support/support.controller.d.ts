import { SupportService } from './support.service';
export declare class SupportController {
    private readonly svc;
    constructor(svc: SupportService);
    create(u: any, b: any): Promise<any>;
    createTicket(u: any, b: any): Promise<any>;
    mine(u: any): Promise<any>;
    one(u: any, id: string): Promise<any>;
    reply(u: any, id: string, b: any): Promise<any>;
    adminList(status?: string): Promise<any>;
    adminUpdate(id: string, b: any): Promise<any>;
    listTickets(id: string): Promise<any>;
    getFaqs(): Promise<{
        id: string;
        question: string;
        answer: string;
    }[]>;
    submitFeedback(id: string, body: any): Promise<{
        success: boolean;
        message: string;
    }>;
    get(u: any): Promise<any>;
    update(u: any, b: any): Promise<any>;
}
