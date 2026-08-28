import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AppointmentDocument } from '../../schemas/appointment.schema';
import { ProviderProfileDocument } from '../../schemas/provider-profile.schema';
import { PrescriptionState } from '../../common/enums';
import { MedicinesService } from '../medicines/medicines.service';
import { PrescriptionRepository } from "./repositories/prescription.repository";
export declare class PrescriptionsService {
    private model;
    private medicines;
    private events;
    private appointments;
    private providers;
    constructor(model: PrescriptionRepository, medicines: MedicinesService, events: EventEmitter2, appointments: Model<AppointmentDocument>, providers: Model<ProviderProfileDocument>);
    private isPrivilegedAdmin;
    private isOwningDoctor;
    private isAssignedPharmacy;
    create(doctor: any, data: {
        patient_id: string;
        appointment_id?: string;
        items: any[];
        diagnosis?: string;
        notes?: string;
    }): Promise<any>;
    uploadByPatient(patient: any, data: {
        upload_image: string;
        items?: any[];
        notes?: string;
    }): Promise<any>;
    transition(id: string, to: PrescriptionState, by: any): Promise<any>;
    sendToPharmacy(id: string, pharmacy_id: string, by: any): Promise<any>;
    substitute(id: string, itemIndex: number, newMedicineId: string, by: any): Promise<any>;
    manualReviewQueue(user: any): Promise<any>;
    activeForPatient(user: any): Promise<any>;
    listMine(patient_id: string): Promise<any>;
    listForDoctor(doctor_id: string): Promise<any>;
    listForPharmacy(pharmacy_id: string): Promise<any>;
    private toPatientWebDto;
    getByIdForUser(id: string, user: any): Promise<{
        id: any;
        status: any;
        items: any;
        issued_at: string;
        doctor: {
            display_name: any;
            specialty: any;
        };
    }>;
}
