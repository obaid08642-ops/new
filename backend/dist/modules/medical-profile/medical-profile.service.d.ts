import { MedicalProfileRepository } from "./repositories/medicalprofile.repository";
export declare class MedicalProfileService {
    private readonly model;
    constructor(model: MedicalProfileRepository);
    getOrCreate(user: any): Promise<any>;
    update(user: any, body: any): Promise<any>;
    getForPatient(user: any, patientId: string): Promise<void>;
    addItem(user: any, list: 'chronic_diseases' | 'allergies' | 'surgeries' | 'long_term_medications' | 'family_history', item: any): Promise<any>;
    removeItem(user: any, list: string, itemId: string): Promise<any>;
}
