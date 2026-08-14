# Nabdah Plus (نبض بلس) — Documentation

Welcome to the documentation for **Nabdah Plus**, the premium healthcare super-app.

## Project Overview

| Area | Description |
|------|-------------|
| **Core Framework** | React Native, Expo, TypeScript |
| **Architecture** | Feature-based Modules, Repository Pattern, Dependency Injection |
| **Design System** | RTL-first, Admin-overridable Theme, Luxury Concept C |
| **Primary Language** | Arabic (with full support for 6+ languages) |
| **Phase 0 Status** | Approved (Single Source of Truth) |

## Documentation Index

| File | Purpose |
|------|---------|
| [PROJECT_CONSTITUTION.md](./PROJECT_CONSTITUTION.md) | Phase 0 — The ultimate architectural source of truth. |
| [DECISIONS.md](./DECISIONS.md) | Architectural Decision Records (ADRs). |
| [CHANGELOG.md](./CHANGELOG.md) | Implementation changelog (Keep a Changelog). |
| [KNOWN_LIMITATIONS.md](./KNOWN_LIMITATIONS.md) | Current technical constraints and technical debt. |
| [FUTURE_ROADMAP.md](./FUTURE_ROADMAP.md) | Planned phases and high-level milestones. |

### Phase Documentation
* [PHASE_1A.md](./PHASE_1A.md) — Foundation & Core Infrastructure
* [PHASE_1B.md](./PHASE_1B.md) — Localization & Navigation
* [PHASE_1C.md](./PHASE_1C.md) — Auth, State, & Data Layer
* [PHASE_2.md](./PHASE_2.md) — Product Discovery Platform (Guided Tour)
* [PHASE_3.md](./PHASE_3.md) — Business Features (Pharmacy, Consultations, etc.)

## Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| PROJECT_CONSTITUTION.md | **Approved** | 2026-07-13 |
| PHASE_1A.md | **Active** | 2026-07-13 |
| PHASE_1B.md | Draft | - |
| PHASE_1C.md | Draft | - |
| PHASE_2.md | Draft | - |
| PHASE_3.md | Draft | - |

## Key Principles

1. **No Hardcoded Values:** All text comes from i18n/CMS. Dimensions from Design System tokens. Keys from `.env` via `ConfigManager`.
2. **Admin-Ready:** Everything is designed to be configurable remotely (colors, fonts, banners, tours).
3. **RTL-First:** Built primarily for Arabic, but scales to LTR dynamically.
4. **Offline Graceful Degradation:** Use `Repository` pattern. Cache locally, sync remotely.
5. **Strict Modules:** Never cross-import between feature modules. Use `src/core` or `src/design-system` for shared code.

## Quick Start
1. Ensure `.env.development` exists (copy from `.env.example`).
2. Run `npm install`
3. Run `npm run start` or `npx expo start -c`
