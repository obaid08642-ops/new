import { Connection } from 'mongoose';
import { AnalyticsSuiteService } from './analytics-suite.service';
import { FinanceSuiteService } from './finance-suite.service';
import { MailService } from '../mail/mail.module';
export declare class ScheduledReportsRunner {
    private readonly conn;
    private readonly analytics;
    private readonly finance;
    private readonly mail;
    private readonly logger;
    private running;
    constructor(conn: Connection, analytics: AnalyticsSuiteService, finance: FinanceSuiteService, mail: MailService);
    runDue(): Promise<void>;
    runOne(row: any): Promise<{
        ok: boolean;
        detail: string;
    }>;
    private computePayload;
}
export declare function toCsv(rows: any[]): string;
