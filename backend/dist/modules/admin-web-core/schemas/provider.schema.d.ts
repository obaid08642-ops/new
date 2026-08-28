import { Document } from 'mongoose';
export type ProviderDocument = Provider & Document;
export declare class Provider {
    name: string;
    type: string;
    verified: boolean;
    nationalId: string;
    commercialCr: string;
    mohLicense: string;
    medicalLicense: string;
    isActive: boolean;
}
export declare const ProviderSchema: import("mongoose").Schema<Provider, import("mongoose").Model<Provider, any, any, any, Document<unknown, any, Provider, any, {}> & Provider & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Provider, Document<unknown, {}, import("mongoose").FlatRecord<Provider>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Provider> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
