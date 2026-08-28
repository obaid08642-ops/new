import { Document } from 'mongoose';
export declare class PasskeyCredential extends Document {
    user_id: string;
    credential_id: string;
    public_key: Buffer;
    counter: number;
    transports: string[];
    device_name: string;
    last_used_at: Date;
}
export declare const PasskeyCredentialSchema: import("mongoose").Schema<PasskeyCredential, import("mongoose").Model<PasskeyCredential, any, any, any, Document<unknown, any, PasskeyCredential, any, {}> & PasskeyCredential & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PasskeyCredential, Document<unknown, {}, import("mongoose").FlatRecord<PasskeyCredential>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PasskeyCredential> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
