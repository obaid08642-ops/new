export declare class PushToken {
    id: string;
    user_id: string;
    token: string;
    provider: string;
    device_id?: string;
    platform?: 'ios' | 'android' | 'web';
    active: boolean;
    last_seen_at: Date;
}
export declare const PushTokenSchema: import("mongoose").Schema<PushToken, import("mongoose").Model<PushToken, any, any, any, import("mongoose").Document<unknown, any, PushToken, any, {}> & PushToken & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PushToken, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<PushToken>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PushToken> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
