import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MaternityProfileDocument } from '../../../schemas/maternity.schema';
export declare class MaternityProfileRepository extends MongoRepository<MaternityProfileDocument> {
    constructor(model: Model<MaternityProfileDocument>);
}
