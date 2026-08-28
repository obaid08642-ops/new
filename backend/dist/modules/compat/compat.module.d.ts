import { Connection } from 'mongoose';
export declare class FamilyChatController {
    private conn;
    constructor(conn: Connection);
    private familyOf;
    list(u: any, limit?: string): Promise<{
        data: any[];
    }>;
    send(u: any, body: any): Promise<{
        data: {
            id: string;
            family_id: string;
            sender_id: any;
            sender_name: any;
            text: string;
            created_at: Date;
        };
    }>;
}
export declare class CompatModule {
}
