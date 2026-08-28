import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Connection } from 'mongoose';
import { Provider } from '../schemas/provider.schema';
export declare class ProviderModerationController {
    private providerModel;
    private readonly connection;
    private events;
    constructor(providerModel: Model<Provider>, connection: Connection, events: EventEmitter2);
    private purgeReplaced;
    getProviderDeltas(): Promise<any>;
    approveDelta(id: string): Promise<{
        success: boolean;
        applied: number;
    }>;
    rejectDelta(id: string): Promise<{
        success: boolean;
    }>;
}
