import { Connection } from 'mongoose';
export declare class PatientGdprController {
    private readonly conn;
    constructor(conn: Connection);
    myRequests(me: any): Promise<{
        data: import("bson").Document[];
    }>;
    createRequest(b: any, me: any): Promise<any>;
    fetchExport(me: any): Promise<any>;
}
