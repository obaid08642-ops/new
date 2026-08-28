import { Document } from 'mongoose';
export declare enum PaymentMethod {
    CASH = "cash",
    INSURANCE = "insurance"
}
export declare enum TransportType {
    PATIENT_PROVIDED = "patient",
    NURSE_PROVIDED = "nurse"
}
export declare enum BookingStatus {
    PENDING_INSURANCE = "pending_insurance",
    PENDING_PAYMENT = "pending_payment",
    CONFIRMED = "confirmed",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed"
}
export declare class HomeCareBooking extends Document {
    patient_id: string;
    nurse_id: string;
    service_id: string;
    selected_dates: string[];
    selected_time: string;
    frequency: string;
    transport_type: string;
    patient_location: {
        address: string;
        lat: number;
        lng: number;
    };
    payment_method: string;
    status: string;
    total_amount: number;
    transport_fee: number;
    insurance_details: {
        provider: string;
        policy_number: string;
        coverage_status: string;
    };
}
export declare const HomeCareBookingSchema: import("mongoose").Schema<HomeCareBooking, import("mongoose").Model<HomeCareBooking, any, any, any, Document<unknown, any, HomeCareBooking, any, {}> & HomeCareBooking & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, HomeCareBooking, Document<unknown, {}, import("mongoose").FlatRecord<HomeCareBooking>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<HomeCareBooking> & Required<{
    _id: import("mongoose").Types.ObjectId;
}> & {
    __v: number;
}>;
