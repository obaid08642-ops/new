export declare class SystemHealthController {
    checkLiveness(): {
        status: string;
        timestamp: string;
        services: {
            database: string;
            redis: string;
            core_api: string;
        };
    };
    checkReadiness(): {
        status: string;
        uptime: number;
        timestamp: string;
    };
}
