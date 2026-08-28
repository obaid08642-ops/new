import { OnModuleInit } from '@nestjs/common';
import { Model } from 'mongoose';
export declare class HomeCareModule implements OnModuleInit {
    private readonly svcModel;
    private readonly logger;
    constructor(svcModel: Model<any>);
    onModuleInit(): Promise<void>;
}
