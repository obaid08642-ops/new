import { SecureStorageService } from '../platform/auth/SecureStorageService';
import { BiometricService } from '../platform/auth/BiometricService';
import { AuthAuditLogger } from '../platform/auth/AuthAuditLogger';
import { AppLockService } from '../platform/auth/AppLockService';
import { PasswordPolicyService } from '../platform/auth/PasswordPolicyService';
import { AccountLockoutService } from '../platform/auth/AccountLockoutService';
import { AuthStateMachine } from '../platform/auth/AuthStateMachine';
import { DeviceTracker } from '../platform/auth/DeviceTracker';
import { SessionManager } from '../platform/auth/SessionManager';
import { JobManager } from '../platform/jobs/JobManager';
import { EventBus } from '../events/EventBus';
import { CacheManager } from '../platform/cache/CacheManager';
import { MessagingService } from '../platform/communication/MessagingService';
import { NotificationCenterManager } from '../platform/communication/NotificationCenterManager';
import { FavoritesManager } from '../platform/business/FavoritesManager';
import { ReviewManager } from '../platform/business/ReviewManager';
import { LoyaltyManager } from '../platform/business/LoyaltyManager';
import { ScheduleManager } from '../platform/scheduling/ScheduleManager';
import { QueueEngine } from '../platform/scheduling/QueueEngine';
import { CartManager } from '../platform/commerce/CartManager';
import { SearchEngine } from '../platform/search/SearchEngine';
import { LocationService } from '../platform/location/LocationService';
import { MediaManager } from '../platform/media/MediaManager';
import { RealtimeClient } from '../platform/realtime/RealtimeClient';
import { RoleManager } from '../platform/user/RoleManager';
import { UserProfileService } from '../platform/user/UserProfileService';
import { AuditManager } from '../events/AuditManager';

import { UserRepository } from '../data/UserRepository';
import { AsyncStorageDataSource } from '../data/AsyncStorageDataSource';
import { HttpRemoteDataSource } from '../data/HttpRemoteDataSource';
import { User } from '../domain/entities/Users';

/**
 * Lightweight Dependency Injection Container
 * Ensures services are decoupled, easily mockable, and resolved via a centralized locator.
 */

type Constructor<T = any> = new (...args: any[]) => T;

export class DIContainer {
  private static instance: DIContainer;
  private services = new Map<string, any>();
  private factories = new Map<string, () => any>();

  private constructor() {}

  public static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  /**
   * Register a singleton instance.
   */
  public register<T>(token: string, instance: T): void {
    if (this.services.has(token)) {
      console.warn(`[DI] Overwriting existing service for token: ${token}`);
    }
    this.services.set(token, instance);
  }

  /**
   * Register a factory for transient resolution or lazy singletons.
   */
  public registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  /**
   * Resolve a dependency.
   */
  public resolve<T>(token: string): T {
    if (this.services.has(token)) {
      return this.services.get(token) as T;
    }

    if (this.factories.has(token)) {
      const factory = this.factories.get(token)!;
      const instance = factory();
      // Cache it as a singleton after first factory call
      this.services.set(token, instance);
      return instance as T;
    }

    throw new Error(`[DI] Service not found for token: ${token}`);
  }

  /**
   * Clear all registrations (useful for testing)
   */
  public clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

export const container = DIContainer.getInstance();

/**
 * Service Tokens for standardizing resolution
 */
export const Tokens = {
  // Core Platform
  Logger: 'Logger',
  HttpClient: 'HttpClient',
  Analytics: 'Analytics',
  FeatureFlags: 'FeatureFlags',
  Permissions: 'Permissions',
  Notifications: 'Notifications',
  FileManager: 'FileManager',
  AuthManager: 'AuthManager',

  // Phase 1B Services (To be implemented)
  EventBus: 'EventBus',
  JobManager: 'JobManager',
  CacheManager: 'CacheManager',
  SearchEngine: 'SearchEngine',
  LocationService: 'LocationService',
  MediaManager: 'MediaManager',
  RealtimeClient: 'RealtimeClient',
  ScheduleManager: 'ScheduleManager',
  QueueEngine: 'QueueEngine',
  CartManager: 'CartManager',
  PaymentProvider: 'PaymentProvider',
  MessagingService: 'MessagingService',
  NotificationCenterManager: 'NotificationCenterManager',
  FavoritesManager: 'FavoritesManager',
  ReviewManager: 'ReviewManager',
  LoyaltyManager: 'LoyaltyManager',
  RoleManager: 'RoleManager',
  AuditManager: 'AuditManager',
  AuthStateMachine: 'AuthStateMachine',
  DeviceTracker: 'DeviceTracker',
  SessionManager: 'SessionManager',
  PasswordPolicyService: 'PasswordPolicyService',
  AccountLockoutService: 'AccountLockoutService',
  BiometricService: 'BiometricService',
  AuthAuditLogger: 'AuthAuditLogger',
  AppLockService: 'AppLockService',
  SecureStorageService: 'SecureStorageService',

  // UI Component Singletons
  UserRepository: 'UserRepository',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Register Phase 1B Repositories
// ─────────────────────────────────────────────────────────────────────────────
// Register the domain EventBus singleton so consumers (e.g. Redux integration
// in src/store/index.ts) don't hit "[DI] Service not found for token: EventBus"
container.register(Tokens.EventBus, new EventBus());

container.registerFactory(Tokens.UserRepository, () => {
  const localSource = new AsyncStorageDataSource<User>('users');
  const remoteSource = new HttpRemoteDataSource<User>('/users');
  return new UserRepository(remoteSource, localSource);
});
