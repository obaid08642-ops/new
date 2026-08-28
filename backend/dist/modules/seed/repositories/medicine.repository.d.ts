import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MedicineDocument } from '../../../schemas/medicine.schema';
export declare class MedicineRepository extends MongoRepository<MedicineDocument> {
    constructor(model: Model<MedicineDocument>);
}
