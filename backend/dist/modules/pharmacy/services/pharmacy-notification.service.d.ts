import { NotificationsService } from '../../notifications/notifications.service';
import { PharmacyAllocation, PharmacyOrder } from '../schemas/pharmacy.schema';
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { RealtimeService } from '../../realtime/realtime.service';
export declare class PharmacyNotificationService {
    private notif;
    private orders;
    private readonly realtime;
    constructor(notif: NotificationsService, orders: PharmacyOrderRepository, realtime: RealtimeService);
    notifyPatientSplitCompleted(order: PharmacyOrder): Promise<void>;
    notifyPharmacyNewAllocation(alloc: any): Promise<void>;
    notifyPatientItemUnavailable(alloc: PharmacyAllocation, item: any): Promise<void>;
    notifyPatientAllocationConfirmed(alloc: PharmacyAllocation): Promise<void>;
    notifyPatientAllocationProgress(alloc: PharmacyAllocation): Promise<void>;
    notifyPatientAllocationCancelled(alloc: PharmacyAllocation, reason?: string): Promise<void>;
    notifyPharmacyBroadcast(pharmacy_account_id: string, order: PharmacyOrder, bc: any): Promise<void>;
    notifyPharmacyBroadcastCancelled(pharmacy_account_id: string, order_id: string, reason: string): Promise<void>;
    private lookupOrderId;
}
