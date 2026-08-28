import { Connection } from 'mongoose';
export declare class ImpersonationSessionService {
    private readonly connection;
    constructor(connection: Connection);
    validate(payload: any): Promise<{
        session: any;
        impersonator: any;
    }>;
}
