import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
export declare class RadiologySeed implements OnModuleInit {
    private readonly svcModel;
    private readonly logger;
    constructor(svcModel: Model<any>);
    onModuleInit(): Promise<void>;
}
export declare class RadiologyModule {
}
