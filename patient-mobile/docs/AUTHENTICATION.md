# Authentication Architecture

This document describes the Phase 1C-A authentication implementation.

## Overview
The authentication flow uses a deterministic `AuthStateMachine` to manage states (`Unauthenticated` -> `Authenticating` -> `Authenticated` -> `Locked` -> `Expired`).

## Pluggable Providers
All authentication providers implement the `IAuthProvider` interface:
- `signIn()`
- `signUp()`
- `signOut()`
- `refreshToken()`
- `revokeSession()`
- `deleteAccount()`
- `resetPassword()`
- `verifyOTP()`
- `linkProvider()`
- `unlinkProvider()`

This ensures zero vendor lock-in and allows dropping in new providers (e.g. biometric-only, YubiKey) without modifying core logic.

## Session Management
Sessions are handled by `SessionManager` which includes:
- **Refresh Token Rotation**: Tokens are rotated on use to prevent replay attacks.
- **Concurrent Refresh Queue**: Prevents multiple rapid refresh requests from causing race conditions.
- **Session Versioning**: Sessions track a version number allowing instant global invalidation remotely.
- **Device Binding**: Sessions are bound to unique device IDs via `DeviceTracker`.
- **Absolute Session Lifetime**: Sessions have a hard limit (e.g. 14 days) after which forced re-authentication is required regardless of idle time.

## Storage
No tokens are stored in `AsyncStorage`. All tokens are encrypted and persisted securely via `SecureStorageService` (Keychain/Keystore).
