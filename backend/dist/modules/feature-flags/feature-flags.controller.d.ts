import { FeatureFlagsService } from './feature-flags.service';
export declare class PublicFeatureFlagsController {
    private svc;
    constructor(svc: FeatureFlagsService);
    all(): Promise<import("./feature-flag.schema").FeatureFlag[]>;
}
export declare class FeatureFlagsController {
    private readonly svc;
    constructor(svc: FeatureFlagsService);
    getAll(): Promise<import("./feature-flag.schema").FeatureFlag[]>;
    setFlag(key: string, enabled: boolean): Promise<import("./feature-flag.schema").FeatureFlag>;
}
