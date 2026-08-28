import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { DriverShiftDocument } from '../../../schemas/driver-shift.schema';
export declare class DriverShiftRepository extends MongoRepository<DriverShiftDocument> {
    constructor(model: Model<DriverShiftDocument>);
}
