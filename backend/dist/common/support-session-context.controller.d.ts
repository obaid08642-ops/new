export declare class SupportSessionContextController {
    context(user: any, req: any): {
        active: boolean;
        read_only: boolean;
        session_id: any;
        expires_at: string;
        target: {
            id: any;
            role: any;
        };
        impersonator: {
            id: any;
            role: any;
        };
    };
}
