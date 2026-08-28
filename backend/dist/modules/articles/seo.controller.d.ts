import { Connection } from 'mongoose';
export declare class SeoController {
    private readonly conn;
    constructor(conn: Connection);
    resolve(type: string, slug: string): Promise<{
        id: any;
        type: string;
    }>;
}
