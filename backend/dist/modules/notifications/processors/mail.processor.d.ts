import { Job } from 'bull';
import { MailService } from '../../mail/mail.module';
export declare class MailProcessor {
    private readonly mail;
    constructor(mail: MailService);
    processOtpEmail(job: Job<{
        destinationEmail: string;
        secureCode: string;
    }>): Promise<void>;
}
