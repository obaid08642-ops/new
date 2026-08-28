import { Document } from 'mongoose';
export declare class HomeCareNurse extends Document {
    name_ar: string;
    name_en: string;
    gender: string;
    facility_name: string;
    degree: string;
    rating: number;
    distance_km: number;
    reviews: any[];
    supported_services: string[];
    supported_packages: string[];
    available_frequencies: string[];
    location: {
        lat: number;
        lng: number;
    };
}
export declare const HomeCareNurseSchema: import("mongoose").Schema<HomeCareNurse, import("mongoose").Model<HomeCareNurse, any, any, any, Document<unknown, any, HomeCareNurse, any, {}> & HomeCareNurse & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HomeCareNurse, Document<unknown, {}, import("mongoose").FlatRecord<HomeCareNurse>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HomeCareNurse> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
