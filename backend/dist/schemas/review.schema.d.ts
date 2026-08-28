export declare class Review {
    id: string;
    provider_id: string;
    patient_id: string;
    booking_kind: string;
    booking_id: string;
    rating: number;
    comment?: string;
    aspects?: {
        wait?: number;
        clarity?: number;
        helpfulness?: number;
    };
    status: 'pending_review' | 'approved' | 'rejected';
}
export declare const ReviewSchema: import("mongoose").Schema<Review, import("mongoose").Model<Review, any, any, any, import("mongoose").Document<unknown, any, Review, any, {}> & Review & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, Review, import("mongoose").Document<unknown, {}, import("mongoose").FlatRecord<Review>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<Review> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
