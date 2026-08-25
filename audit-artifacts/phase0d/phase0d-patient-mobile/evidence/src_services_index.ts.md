# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/services/index.ts`
- **Member SHA-256:** `da2027f7d42048f5c6cda0f8b3ccf2ea2c784d5433925508934cb2f081ce9a5d`
- **Line count:** 59
- **Read range:** `1-59`
- **Classification:** `OWNED_SOURCE_OR_CONFIG`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- `58: type DownloadOptions, type UploadOptions,`
### backend_consumers_or_contracts
- `53: } from './Notifications';`
### auth_ownership
- `37: // Permissions`
- `39: permissions,`
- `40: type PermissionKey, type PermissionStatus,`
- `41: } from './PermissionsManager';`
### state_transitions
- `11: HttpError,`
- `17: // Error Handling`
- `19: AppError, parseError, logError, getUserFriendlyMessage,`
- `20: tryCatch, addErrorListener, AppErrorBoundary,`
- `21: type AppErrorCode,`
- `22: } from './ErrorHandler';`
- `40: type PermissionKey, type PermissionStatus,`
### payment_insurance_relevance
- `52: type NotificationType, type NotificationPayload,`
### error_empty_loading_retry_cancel
- `9: enqueueOfflineRequest, getOfflineQueue, flushOfflineQueue,`
- `11: HttpError,`
- `17: // Error Handling`
- `19: AppError, parseError, logError, getUserFriendlyMessage,`
- `20: tryCatch, addErrorListener, AppErrorBoundary,`
- `21: type AppErrorCode,`
- `22: } from './ErrorHandler';`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
