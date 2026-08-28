import { FeatureFlag } from './feature-flag.schema';
import { FeatureFlagRepository } from "./repositories/featureflag.repository";
export declare class FeatureFlagsService {
    private readonly flagModel;
    constructor(flagModel: FeatureFlagRepository);
    isEnabled(flagKey: string): Promise<boolean>;
    setFlag(flagKey: string, enabled: boolean): Promise<FeatureFlag>;
    getAll(): Promise<FeatureFlag[]>;
}
