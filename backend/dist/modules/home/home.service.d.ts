import { Model } from 'mongoose';
import { PromotionCampaignDocument } from '../../schemas/promotion-campaign.schema';
import { AppointmentDocument } from '../../schemas/appointment.schema';
export declare class HomeService {
    private promoModel;
    private apptModel;
    private request;
    constructor(promoModel: Model<PromotionCampaignDocument>, apptModel: Model<AppointmentDocument>, request: any);
    getOffers(): Promise<{
        id: any;
        t: string;
        price: number;
        old: number;
        disc: string;
        rating: any;
        prov: any;
        c: string;
        ic: string;
        sponsored: any;
    }[]>;
    getUpcomingAppointment(): Promise<{
        id: any;
        date: string;
        doctorName: string;
        type: string;
        time: string;
    }>;
    globalSearch(query: string): Promise<any[]>;
}
