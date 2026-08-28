import { EventEmitter2 } from '@nestjs/event-emitter';
import { ProviderRequestType, ProviderRequestPriority } from '../schemas/requests.schema';
import { ProviderNotificationsService } from './provider-notifications.service';
import { ProviderScoringService } from './provider-scoring.service';
import { AssignmentStrategyService } from './assignment-strategy.service';
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAuditLogRepository } from "./repositories/providerauditlog.repository";
import { ProviderOperatorRepository } from './repositories/provideroperator.repository';
export declare class ProviderRequestEngineService {
    private requests;
    private audit;
    private readonly notifs;
    private readonly scoring;
    private readonly events;
    private readonly assignment;
    private readonly operators;
    private logger;
    constructor(requests: ProviderRequestRepository, audit: ProviderAuditLogRepository, notifs: ProviderNotificationsService, scoring: ProviderScoringService, events: EventEmitter2, assignment: AssignmentStrategyService, operators: ProviderOperatorRepository);
    list(user: any, q: {
        status?: string;
        type?: string;
        limit?: string;
        offset?: string;
        q?: string;
    }): Promise<{
        items: any;
        total: any;
        limit: number;
        offset: number;
    }>;
    detail(user: any, id: string): Promise<any>;
    private transition;
    accept(user: any, id: string, body?: {
        note?: string;
        scheduled_at?: string;
    }): Promise<any>;
    reject(user: any, id: string, body?: {
        reason?: string;
        note?: string;
    }): Promise<any>;
    start(user: any, id: string, body?: {
        note?: string;
    }): Promise<any>;
    complete(user: any, id: string, body?: {
        note?: string;
    }): Promise<any>;
    cancel(user: any, id: string, body?: {
        reason?: string;
        note?: string;
    }): Promise<any>;
    assignStaff(user: any, id: string, body: {
        staff_id: string;
        notes?: string;
    }): Promise<any>;
    createInternal(input: {
        provider_account_id: string;
        type: ProviderRequestType;
        patient: any;
        payload: any;
        summary_ar?: string;
        summary_en?: string;
        amount_total?: number;
        priority?: ProviderRequestPriority;
        scheduled_at?: Date;
        seeded?: boolean;
    }): Promise<any>;
    private statusTitleAr;
    private statusTitleEn;
    private typeIcon;
}
