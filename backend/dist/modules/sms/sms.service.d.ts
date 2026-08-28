import { Connection } from 'mongoose';
export declare class SmsService {
    private readonly conn;
    private readonly logger;
    constructor(conn: Connection);
    private get flags();
    isEnabled(): Promise<boolean>;
    sendOtp(phone: string, otp: string): Promise<boolean>;
}
