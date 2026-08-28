import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderBranchDocument } from '../../schemas/provider-branch.schema';
import { ProviderType, ProviderStatus } from '../../common/enums';
import { UserRepository } from "./repositories/user.repository";
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { CatalogPublicationService } from '../events/catalog-publication.service';
export declare class ProvidersService {
    private userModel;
    private providerModel;
    private branchModel;
    private events;
    private readonly publication;
    constructor(userModel: UserRepository, providerModel: ProviderProfileRepository, branchModel: Model<ProviderBranchDocument>, events: EventEmitter2, publication: CatalogPublicationService);
    private refreshPublicProjection;
    createBranchStaffAccount(adminId: string, branchId: string, staffDto: any): Promise<{
        success: boolean;
        message: string;
    }>;
    apply(data: {
        full_name: string;
        phone: string;
        password: string;
        email?: string;
        type: ProviderType;
        name_ar: string;
        name_en?: string;
        license_number?: string;
        city?: string;
        district?: string;
        specialty?: string;
        years_experience?: number;
        consultation_modes?: string[];
        price_clinic?: number;
        price_online?: number;
        pharmacy_chain?: string;
        has_own_drivers?: boolean;
    }): Promise<{
        ok: boolean;
        user: any;
        profile: any;
    }>;
    adminCreate(data: any, _admin: any): Promise<{
        ok: boolean;
        user: any;
        profile: any;
        generated_password: any;
    }>;
    approve(id: string, admin: any): Promise<any>;
    reject(id: string, admin: any, reason: string): Promise<any>;
    suspend(id: string, admin: any, reason: string): Promise<any>;
    listPending(): Promise<any>;
    listAll(type?: ProviderType, status?: ProviderStatus, search?: string): Promise<any>;
    private publicDiscoveryFilter;
    listPublic(type?: ProviderType, city?: string, insurance_company?: string, insurance_network?: string, insurance_class?: string): Promise<any>;
    mapProviders(type?: string, lat?: number, lng?: number, radiusKm?: number): Promise<any>;
    getById(id: string): Promise<any>;
    getPublicById(id: string): Promise<any>;
    myProfile(actor: any): Promise<any>;
    private typeToRole;
    private publicUser;
    seedDemoProviders(): Promise<void>;
    updateProviderConfig(providerId: string, payload: any): Promise<any>;
}
