export declare class AdminConfigController {
    getSLA(): Promise<{
        consultationDuration: number;
        callRingingDuration: number;
        jwtExpiry: number;
        systemStatus: string;
    }>;
    updateSLA(body: any): Promise<{
        status: string;
        data: any;
    }>;
}
