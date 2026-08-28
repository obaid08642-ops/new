export declare class PaymobService {
    private readonly logger;
    getMethods(): Promise<{
        id: string;
        icon: string;
        label: string;
        sub: string;
        color: string;
    }[]>;
    initiate(payload: any): Promise<any>;
    verify(payload: any): Promise<any>;
}
