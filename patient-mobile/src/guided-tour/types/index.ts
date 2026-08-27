export type TourStatus = 'idle' | 'loading' | 'starting' | 'active' | 'paused' | 'resuming' | 'celebrating' | 'completed' | 'skipped' | 'error' | 'recovering';

export interface TourDefinition {
  id: string;
  module: string;
  schemaVersion: string;
  contentVersion: string;
  tourVersion: string;
  appCompatVersion: string;
  minAppVersion: string;
  maxAppVersion?: string;
  platform?: 'ios' | 'android' | 'both';
  steps: TourStepDefinition[];
  trigger: TriggerConfig;
  cooldown?: any;
  interactive?: boolean;
  celebrateOnComplete?: boolean;
  priority: number;
  featureFlag?: string;
}

export interface TourStepDefinition {
  id: string;
  target: any;
  type: 'passive' | 'interactive' | 'confirmation';
  position: 'auto' | 'top' | 'bottom' | 'left' | 'right';
  highlight: any;
  action?: any;
  skippable: boolean;
  required?: boolean;
}

export interface TriggerConfig {
  on: 'module_first_visit' | 'app_first_open' | 'feature_first_use' | 'manual';
  delay?: number;
  condition?: () => boolean;
}

export interface TourPersistenceRecord {
  tourId: string;
  userId: string;
  status: 'completed' | 'skipped' | 'in_progress' | 'skip_all';
  completedSteps: string[];
  lastStep?: string;
  crashCount: number;
  lastCrashAt?: string;
  seenAt: string;
  completedAt?: string;
  schemaVersion: string;
  contentVersion: string;
  tourVersion: string;
  appVersion: string;
  locale: string;
}
