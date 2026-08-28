/**
 * Services — Barrel export for all Phase 1A services.
 * Import from '@/services' — never from individual files.
 */

// HTTP Client
export {
  http, httpRequest, apiFetch, fetchPaginated,
  enqueueOfflineRequest, getOfflineQueue, flushOfflineQueue,
  addInterceptor,
  HttpError,
  BASE_URL, FASTAPI_BASE_URL, CDN_URL,
  type HttpRequestConfig, type HttpResponse, type PaginatedResponse,
  type HttpInterceptor,
} from './HttpClient';

// Error Handling
export {
  AppError, parseError, logError, getUserFriendlyMessage,
  tryCatch, addErrorListener, AppErrorBoundary,
  type AppErrorCode,
} from './ErrorHandler';

// Logger
export {
  logger,
  type LogLevel, type LogEntry,
} from './Logger';

// Analytics
export {
  analytics, AnalyticsEvents,
  type AnalyticsEvent, type AnalyticsProvider,
  type AnalyticsUserProperties, type AnalyticsEventName,
} from './Analytics';

// Permissions
export {
  permissions,
  type PermissionKey, type PermissionStatus,
} from './PermissionsManager';

// Feature Flags
export {
  featureFlags,
  type FlagKey, type FeatureFlag, type FlagEvaluationContext,
} from './FeatureFlags';

// Notifications
export {
  notifications,
  type NotificationType, type NotificationPayload,
} from './Notifications';

// File Manager
export {
  fileManager,
  type DownloadOptions, type UploadOptions,
} from './FileManager';
