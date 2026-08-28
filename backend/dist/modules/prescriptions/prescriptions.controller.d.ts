import { PrescriptionsService } from './prescriptions.service';
import { PrescriptionState } from '../../common/enums';
export declare class PrescriptionsController {
    private svc;
    constructor(svc: PrescriptionsService);
    create(body: any, user: any): Promise<any>;
    upload(body: any, user: any): Promise<any>;
    manualEntry(body: any, user: any): Promise<any>;
    send(id: string, body: any, user: any): Promise<any>;
    transition(id: string, body: {
        to: PrescriptionState;
    }, user: any): Promise<any>;
    sub(id: string, body: {
        item_index: number;
        new_medicine_id: string;
    }, user: any): Promise<any>;
    manualReviewQueue(user: any): Promise<any>;
    active(user: any): Promise<any>;
    mine(id: string): Promise<any>;
    doctorMine(id: string): Promise<any>;
    pharmacyQueue(id: string): Promise<any>;
    one(id: string, user: any): Promise<{
        id: any;
        status: any;
        items: any;
        issued_at: string;
        doctor: {
            display_name: any;
            specialty: any;
        };
    }>;
}
