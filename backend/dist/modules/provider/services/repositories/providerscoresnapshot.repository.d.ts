import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderScoreSnapshot } from '../../schemas';
export declare class ProviderScoreSnapshotRepository extends MongoRepository<ProviderScoreSnapshot> {
    constructor(model: Model<ProviderScoreSnapshot>);
}
