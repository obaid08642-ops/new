import { EventEmitter2 } from '@nestjs/event-emitter';
export interface MailResult {
    ok: boolean;
    provider: 'resend' | 'ses' | 'none';
    fallback_used: boolean;
    error?: string;
}
export declare class MailService {
    private readonly events;
    private readonly logger;
    private resend;
    constructor(events: EventEmitter2);
    get fromAddress(): string;
    private sesConfigured;
    private sendViaResend;
    private sendViaSes;
    send(to: string, subject: string, html: string, text?: string): Promise<MailResult>;
    sendWithAttachment(opts: {
        to: string;
        subject: string;
        html: string;
        text?: string;
        filename?: string;
        content?: string;
    }): Promise<MailResult>;
    private sendViaSesWithAttachment;
    sendOtp(to: string, code: string): Promise<MailResult>;
}
export declare class MailModule {
}
