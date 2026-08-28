import { Model } from 'mongoose';
import { SystemConfigDocument } from '../../schemas/system-config.schema';
export declare class SystemConfigController {
    private readonly configModel;
    constructor(configModel: Model<SystemConfigDocument>);
    getConfig(): Promise<{
        key: string;
        value: any;
    }>;
    updateConfig(body: {
        value: any;
    }): Promise<{
        key: string;
        value: any;
    }>;
}
