# Phase 8 — Batch V: Provider network configuration integrity

## Purpose

The Provider audit found several routes that could bypass the intended production API configuration: stale `nabdahplus.sa/.com` hosts, emulator/localhost fallbacks, an environment-controlled socket host, a persistent `CUSTOM_API_IP` override in axios and authentication, and a hidden login-screen UI that allowed a user to redirect provider credentials to raw HTTP IP address.

## Source change

| Surface | Implemented control |
|---|---|
| Canonical API configuration | `API_BASE` now validates the declared runtime value and permits only `https://api.nabd.plus/api/v1`; insecure protocol, legacy host, altered path, query, fragment, or malformed configuration throws instead of silently routing credentials. |
| REST clients | Shared axios and the previously stale `HttpClient` use the validated `API_BASE`. The interceptor no longer reads or honors `CUSTOM_API_IP`. |
| Login and refresh | Provider login and refresh now always use `API_BASE`; a saved custom IP cannot redirect credential-bearing requests. |
| Provider UI | The long-press/version-link IP override trigger and override modal were removed from the release login screen. |
| WebSocket | Pharmacy chat derives its Socket.IO origin from the same validated API base; it no longer prefers a separate `EXPO_PUBLIC_BACKEND_URL`. |
| Regression guard | Release-contract coverage asserts the canonical host, absence of the override mechanism/local emulator route/legacy domains, and the shared HTTP base. |

## Verification

| Gate | Result |
|---|---|
| Provider release-contract suite | **PASS** — 1 suite, 9 tests. |
| Provider TypeScript check | **PASS** — `npx tsc --noEmit`. |
| Provider production Expo web export | **PASS**. |
| Archive integrity | **PASS** — rebuilt Provider archive validates with `unzip -tq`; dependencies and build outputs are excluded. |
| Provider archive SHA-256 | `cfa335b5de3d0d7fcdfc3986507987dcdf2fb82337dcb67cfccd149c837ac6e0` |
| Branch upload | **PASS** — source commit `34e424b` (`fix: harden provider API configuration`) is on `manus/on-live-reconciliation`. |

## Toolchain observation

The initial provider dependency installation encountered a peer-resolution conflict, then inode exhaustion from stale local worktrees. The cleanup removed only reinstallable `node_modules`, `.expo`, `dist`, coverage, partial installation and npm-cache data from inactive local copies; no source archive or production data was removed. A fresh `npm ci --legacy-peer-deps` then completed, and all stated Provider gates passed. The package reports dependency advisories (8 moderate, 16 high) that remain a Phase 9 dependency/security gate; this batch did not apply a blind dependency upgrade.

## Acceptance limits

No production connection, credential, provider account, request, payment, or patient record was used. Phase 10–11 must still validate login/refresh/socket behavior on Android and iOS under normal and weak network conditions, test rejected configuration in a release-like build, and repeat endpoint BOLA matrices after a reviewer-authorized deployment.
