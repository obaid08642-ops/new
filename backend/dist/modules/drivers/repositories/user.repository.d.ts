import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { UserDocument } from '../../../schemas/user.schema';
export declare class UserRepository extends MongoRepository<UserDocument> {
    constructor(model: Model<UserDocument>);
}
