export interface MailMessage {
    to: string;
    subject: string;
    text?: string;
    html?: string;
    tag?: string;
}
export declare class ProviderMailerService {
    private adapter;
    private logger;
    constructor();
    send(msg: MailMessage): Promise<{
        id?: string;
        status: "sent" | "logged" | "failed";
        error?: string;
    }>;
}
