import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderScoreSnapshot } from '../../../provider/schemas/capabilities.schema';
export declare class ProviderScoreSnapshotRepository extends MongoRepository<ProviderScoreSnapshot> {
    constructor(model: Model<ProviderScoreSnapshot>);
}
