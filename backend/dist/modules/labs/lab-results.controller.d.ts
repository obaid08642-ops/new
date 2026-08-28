import { LabResultsService } from './lab-results.service';
export declare class LabResultsController {
    private readonly svc;
    constructor(svc: LabResultsService);
    create(u: any, b: any): Promise<any>;
    mine(u: any): Promise<any[]>;
    byBkg(u: any, bid: string): Promise<any>;
    one(u: any, id: string): Promise<any>;
}
