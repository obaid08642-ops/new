import { CustomServicesService } from './custom-services.service';
export declare class CustomServicesController {
    private readonly svc;
    constructor(svc: CustomServicesService);
    create(u: any, b: any): Promise<any>;
    mine(u: any, k?: string): Promise<any>;
    one(u: any, id: string): Promise<any>;
    list(k?: string, s?: string): Promise<any>;
    updateStatus(u: any, id: string, b: any): Promise<any>;
}
