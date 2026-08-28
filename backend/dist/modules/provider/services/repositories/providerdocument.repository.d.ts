import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { ProviderDocument } from '../../schemas';
export declare class ProviderDocumentRepository extends MongoRepository<ProviderDocument> {
    constructor(model: Model<ProviderDocument>);
}
