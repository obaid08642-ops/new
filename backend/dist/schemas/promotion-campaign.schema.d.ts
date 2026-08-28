import { Document } from 'mongoose';
export declare class PromotionCampaign extends Document {
    id: string;
    provider_id: string;
    title_ar: string;
    title_en: string;
    original_price: number;
    discounted_price: number;
    start_date: Date;
    end_date: Date;
    image_url?: string;
    status: string;
    target_parameters?: any;
}
export type PromotionCampaignDocument = PromotionCampaign & Document;
export declare const PromotionCampaignSchema: import("mongoose").Schema<PromotionCampaign, import("mongoose").Model<PromotionCampaign, any, any, any, Document<unknown, any, PromotionCampaign, any, {}> & PromotionCampaign & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PromotionCampaign, Document<unknown, {}, import("mongoose").FlatRecord<PromotionCampaign>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PromotionCampaign> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
