import { Model } from 'mongoose';
import { MongoRepository } from '../../../../common/database/mongo.repository';
import { Quotation } from '../../schemas/quotation.schema';
export declare class QuotationRepository extends MongoRepository<Quotation> {
    constructor(model: Model<Quotation>);
}
