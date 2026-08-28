import { Model } from 'mongoose';
import { MongoRepository } from '../../../common/database/mongo.repository';
import { MedicationReminder } from '../../../schemas/health.schema';
export declare class MedicationReminderRepository extends MongoRepository<MedicationReminder> {
    constructor(model: Model<MedicationReminder>);
}
