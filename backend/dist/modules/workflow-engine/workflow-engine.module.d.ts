import { Model } from 'mongoose';
import { ServiceState, ServiceDomain } from '../../common/enums';
import { OrderDocument } from '../../schemas/order.schema';
import { LabBooking } from '../../schemas/lab.schema';
import { RadiologyBooking } from '../../schemas/radiology.schema';
import { FacilityDocument } from '../../schemas/facility.schema';
import { EventBusService } from '../events/event-bus.service';
export declare const STATE_MAP: Record<ServiceDomain, Record<string, ServiceState>>;
export declare function toUniversal(kind: ServiceDomain, domainState: string): ServiceState;
export declare function domainStatesFor(kind: ServiceDomain, universal: ServiceState): string[];
export declare class WorkflowEngineService {
    private orders;
    private labs;
    private rads;
    private providers;
    private facilityModel;
    private bus;
    constructor(orders: Model<OrderDocument>, labs: Model<LabBooking>, rads: Model<RadiologyBooking>, providers: Model<any>, facilityModel: Model<FacilityDocument>, bus: EventBusService);
    validate(kind: ServiceDomain, fromDomain: string, toDomain: string): {
        from: ServiceState;
        to: ServiceState;
    };
    private universalEventType;
    private entityType;
    apply<T>(args: {
        kind: ServiceDomain;
        entity_id: string;
        from_domain: string;
        to_domain: string;
        actor_account_id?: string;
        actor_role?: string;
        reason?: string;
        patient_account_id?: string;
        meta?: any;
        mutate: () => Promise<T>;
    }): Promise<T>;
    transition<T>(args: {
        kind: ServiceDomain;
        entity_id: string;
        from_domain: string;
        to_domain: string;
        actor_account_id?: string;
        actor_role?: string;
        reason?: string;
        patient_account_id?: string;
        meta?: any;
        mutate: () => Promise<T>;
    }): Promise<T>;
    announceCreated(args: {
        kind: ServiceDomain;
        entity_id: string;
        actor_account_id?: string;
        actor_role?: string;
        patient_account_id?: string;
        meta?: any;
    }): Promise<void>;
    rankProviders(criteria: {
        kind: ServiceDomain;
        service_keys?: string[];
        service_ids?: string[];
        specialty?: string;
        insurance?: string;
        insurance_company?: string;
        insurance_network?: string;
        insurance_class?: string;
        accepts_insurance?: boolean;
        facility_accepts_insurance?: boolean;
        home_visit?: boolean;
        city?: string;
        location?: {
            lat: number;
            lng: number;
        };
        max_results?: number;
    }): Promise<any[]>;
    orchestrate(args: {
        kind: ServiceDomain;
        patient_account_id: string;
        service_keys?: string[];
        service_ids?: string[];
        specialty?: string;
        insurance?: string;
        home_visit?: boolean;
        city?: string;
        location?: {
            lat: number;
            lng: number;
        };
    }): Promise<{
        trace_id: string;
        providers: any[];
        universal_state: ServiceState;
    }>;
    toUniversalView(kind: ServiceDomain, domainState: string): ServiceState;
}
export declare class WorkflowController {
    private engine;
    constructor(engine: WorkflowEngineService);
    lifecycle(): {
        states: ServiceState[];
        transitions: Record<ServiceState, ServiceState[]>;
        kind_state_map: Record<ServiceDomain, Record<string, ServiceState>>;
        events: string[];
    };
    universal(kind: ServiceDomain, state: string): {
        kind: ServiceDomain;
        domain_state: string;
        universal_state: ServiceState;
    };
    match(b: any): Promise<any[]>;
    debug(): Record<ServiceDomain, Record<string, ServiceState>>;
}
export declare class WorkflowEngineModule {
}
