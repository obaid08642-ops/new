import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { BanDocument } from '../bans.schema';
export declare class BanRepository extends MongoRepository<BanDocument> {
    constructor(model: Model<BanDocument>);
}
