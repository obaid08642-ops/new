# Future Roadmap

This document outlines the planned work and high-level milestones for Nabdah Plus.

## Phase 1: Core Infrastructure
*Status: In Progress*

### Phase 1A — Foundation & Core Infrastructure
- Project architecture, Design System, Theme Engine.
- Centralized services (HttpClient, Logger, Analytics, FeatureFlags, Permissions).
- Dependency Injection and Config Management.

### Phase 1B — Localization & Navigation
- Complete i18n infrastructure for 6 languages (RTL/LTR).
- Expo Router setup with Auth/Guest/Admin guards.
- Deep linking architecture.
- Route lazy loading.

### Phase 1C — Auth, State & Data Layer
- Multi-provider Auth (Email, Phone, Google, Apple, Biometric).
- Complete Redux state architecture setup.
- Repository pattern full implementation (Offline-first data sync).

---

## Phase 2: Product Discovery Platform
*Status: Planned (Guided Tour Phase 0 Architecture)*

- **TourEngine & PlatformContainer:** Dependency injection for tour logic.
- **Renderers:** `SkiaRenderer` and `SvgRenderer`.
- **TargetResolver:** Finding UI elements across screens.
- **CrashRecoveryManager:** Ensuring bad tours don't break the app.
- **ContentProvider:** Static fallbacks moving to remote CMS.
- **Implementation:** Home Tour (4 steps × 6 languages) + individual module tours.

---

## Phase 3: Business Features
*Status: Planned*

Implementation of the core healthcare modules:
- **Pharmacy:** Med search, prescription upload, cart, orders.
- **Consultations:** Doctor search, scheduling, video/chat rooms.
- **Diagnostics:** Lab tests, home visits, result tracking.
- **Nursing:** Home nursing requests, scheduling.
- **Payments:** Gateway integration, wallets, loyalty points.
- **Insurance:** Approvals, copay calculations.

---

## Phase 4: AI & Advanced Features
*Status: Planned*

- **AI Health Assistant:** LLM-powered symptom checker and guide.
- **Voice Search:** Natural language search for medicines and doctors.
- **Predictive Recommendations:** Suggesting refills or follow-ups.
- **Health Monitoring:** Integrating with Apple Health / Google Fit.

---

## Parallel Track: Admin Dashboard
*Status: Planned*

- CMS for Guided Tour content.
- Theme management (colors, banners).
- Feature flag control panel.
- Analytics and audit logs dashboard.
