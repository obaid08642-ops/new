import { Reducer, Middleware } from '@reduxjs/toolkit';
import { ReducerManager } from './ReducerManager';

export interface FeatureModule {
  name: string;
  reducer?: Reducer;
  middleware?: Middleware[];
  // Future extensions for the registry
  permissions?: string[];
  flags?: string[];
  locales?: Record<string, any>;
}

class FeatureRegistryCore {
  private features = new Map<string, FeatureModule>();
  private reducerManager: ReducerManager | null = null;
  private dynamicMiddlewares: Middleware[] = [];

  /**
   * Must be called during store initialization to link the ReducerManager
   */
  public setReducerManager(manager: ReducerManager) {
    this.reducerManager = manager;
    // Inject any reducers that were registered before the store was created
    this.features.forEach((feature) => {
      if (feature.reducer) {
        this.reducerManager?.add(feature.name, feature.reducer);
      }
    });
  }

  /**
   * Register a new business module (e.g., Pharmacy, Consultations)
   */
  public register(feature: FeatureModule) {
    if (this.features.has(feature.name)) {
      console.warn(`[FeatureRegistry] Feature ${feature.name} is already registered.`);
      return;
    }
    
    this.features.set(feature.name, feature);

    if (feature.reducer && this.reducerManager) {
      this.reducerManager.add(feature.name, feature.reducer);
    }

    if (feature.middleware) {
      this.dynamicMiddlewares.push(...feature.middleware);
    }
  }

  public getDynamicMiddlewares(): Middleware[] {
    return this.dynamicMiddlewares;
  }
}

export const FeatureRegistry = new FeatureRegistryCore();
