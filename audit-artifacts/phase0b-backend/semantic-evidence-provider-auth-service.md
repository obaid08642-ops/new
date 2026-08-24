# Phase 0B semantic evidence — provider-auth.service.ts

**Archive member:** `src/modules/provider/services/provider-auth.service.ts`  
**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`  
**Read ranges:** lines 2–120 and 121–221; full 221-line member covered.

## Registration and token construction

Lines 2–25 import Mongoose, bcryptjs, JwtService, provider schemas/enums, OTP and provider repositories, crypto, and define injected account/profile/audit/session repositories, OTP and JWT services. Lines 27–39 sign a JWT containing provider account ID, role `provider`, provider type and scope; expose a limited public account; validate email format and password length/letter+number composition.

Lines 41–55 register by validating/normalizing input, rejecting duplicate email, bcrypt-hashing with cost 10, creating an email-unverified account and profile, writing an audit record, issuing email verification OTP with IP/UA/account metadata, and returning public account, OTP response and required documents.

Lines 57–98 login by normalizing email, rejecting unknown/locked accounts, comparing bcrypt password, incrementing failed attempts and locking after five failures for 15 minutes, resetting counters on success, auditing login, creating a 30-day session with random refresh token and bcrypt hash, loading profile, and returning access token, raw refresh token, session ID, provider identity, `permissions: ['*']`, account and profile.

## Refresh and logout

Lines 100–154 refresh an active session by session ID, revoke on device mismatch/expiry/bad refresh token, load the account, reject locked/suspended/rejected accounts, rotate the refresh token and expiry, audit, load profile, and return a new access token plus raw refresh token and `permissions: ['*']`. The refresh comparison is bcrypt-based; device identity is compared directly.

Lines 156–163 revoke a supplied session ID, look it up, audit if found, and always return `{ok:true}`. No visible actor binding is required for logout: possession of a session ID can trigger revocation of another session unless controller-level checks constrain it.

## OTP, password reset and profile

Lines 165–185 issue OTP for arbitrary supplied email/purpose and verify email OTP. Verification permits no account during onboarding and returns `{ok:true,onboarding:true}`; otherwise it marks email verified, applies an allowed status transition, audits only indirectly through save path, and returns public account plus a JWT token.

Lines 187–193 implement generic forgot-password response for unknown email and issue reset OTP for known account. Lines 195–201 check reset codes non-consumingly but return an error for unknown account, which may reintroduce email/account-state distinguishability despite the generic forgot response. Lines 203–213 validate and reset password after consuming OTP, clear lock counters, save, audit, and return public account plus JWT token. Lines 215–220 load account/profile and return public account/profile/required documents.

## Confirmed security and truthfulness findings

**Token exposure:** login, refresh, email verification and password reset return bearer JWTs and/or raw refresh tokens in service results; this member does not show httpOnly cookie exchange or token redaction. Browser security depends entirely on controller/BFF handling.

**Overbroad permissions:** login and refresh return `permissions: ['*']`, which is a potentially universal provider authority claim rather than least privilege; no permission derivation is visible.

**Session security:** session lookup is by supplied session ID; refresh binds device identifier and rotates tokens, but no visible session ownership/actor binding, reuse detection, absolute revocation family, IP risk, or concurrent rotation control exists. Logout revokes any supplied session ID.

**OTP boundary:** `sendOtp` accepts arbitrary purpose and email without visible provider-account binding, verified channel policy, purpose allowlist or rate-limit behavior in this member. Email verification intentionally supports onboarding without provider account, but account takeover and email normalization consistency require integration proof.

**Reset enumeration:** `verifyResetCode` throws a specific no-active-code error for absent accounts, unlike `forgotPassword` generic OK, creating a potential enumeration side channel.

**Atomicity/audit:** account creation, profile creation, audit creation and OTP issuance are sequential without visible transaction/outbox compensation. Failed intermediate steps can leave partial onboarding. Failed-login counter update is read-modify-write without visible atomic CAS, allowing races around lock threshold.

**Credential policy:** password policy is minimum eight characters plus letters/numbers, with no visible breached-password, maximum length, reuse, MFA, or recovery-hardening control. JWT TTL/issuer/audience are delegated to configuration not shown here.

**Truthfulness/data source:** profile and required documents come from repositories/enums; no external identity/document verification is visible. The returned `profile_status` and `permissions` are claims, not evidence of approval or licensing.

**Test implications:** require integration tests for token transport/cookies, claims/permissions, session ownership and rotation races, logout authorization, OTP purpose/rate limits/TTL/replay, enumeration, transactional registration, atomic lockout, MFA/recovery policy, audit completeness and provider status authorization. No tests executed during this semantic read.
