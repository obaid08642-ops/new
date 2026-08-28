import { Model } from 'mongoose';
import { UserDocument } from '../../schemas/user.schema';
export declare class DataRetentionService {
    private readonly userModel;
    private readonly logger;
    constructor(userModel: Model<UserDocument>);
    enforceDataRetention(): Promise<void>;
}
