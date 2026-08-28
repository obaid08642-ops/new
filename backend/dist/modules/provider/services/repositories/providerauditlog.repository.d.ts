import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderAuditLog } from '../../schemas';
export declare class ProviderAuditLogRepository extends MongoRepository<ProviderAuditLog> {
    constructor(model: Model<ProviderAuditLog>);
}
