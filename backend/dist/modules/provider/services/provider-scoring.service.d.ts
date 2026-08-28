import { AssignmentAttemptStatus } from '../schemas/capabilities.schema';
import { ProviderScoreSnapshotRepository } from "./repositories/providerscoresnapshot.repository";
import { ProviderRequestRepository } from "./repositories/providerrequest.repository";
import { ProviderAssignmentAttemptRepository } from "./repositories/providerassignmentattempt.repository";
export declare class ProviderScoringService {
    private scores;
    private requests;
    private attempts;
    constructor(scores: ProviderScoreSnapshotRepository, requests: ProviderRequestRepository, attempts: ProviderAssignmentAttemptRepository);
    recompute(provider_account_id: string): Promise<any>;
    getMy(user: any): Promise<any>;
    getForIds(ids: string[]): Promise<Record<string, any>>;
    onLifecycleEvent(provider_account_id: string): Promise<void>;
    markAttemptResponse(request_id: string, provider_account_id: string, status: AssignmentAttemptStatus, reason?: string): Promise<void>;
}
