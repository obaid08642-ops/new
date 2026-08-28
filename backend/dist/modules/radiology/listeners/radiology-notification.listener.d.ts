import { Model } from 'mongoose';
export declare class RadiologyNotificationListener {
    private readonly notificationModel;
    private readonly logger;
    constructor(notificationModel: Model<any>);
    handleRadiologyDoctorNotifyEvent(payload: {
        doctorId: string;
        patientId: string;
        patientName: string;
        reportId: string;
        pdfUrl?: string;
        dicomViewerUrl?: string;
    }): Promise<void>;
}
