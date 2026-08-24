# Semantic evidence — Patient Web profile, family and insurance

Baseline: `22526bedb77a3d8148219036367e4714f401aecc`.

## Profile

Source: `app/[locale]/profile/page.tsx`.

The page requires patient access and concurrently reads `/users/me/profile`, `/medical-profile` and `/users/me/insurance`. It whitelists accepted identity, medical and insurance fields through `readProfileFields`, derives domain states and renders translated empty/forbidden/unavailable states. It exposes quick links to health, appointments, orders, prescriptions, medicines, family, notifications, settings and articles. This is a sensitive read surface with explicit field selection, but caching, redaction, browser exposure and caller-level ownership require verification.

## Family

Source: `app/[locale]/family/page.tsx`.

The page requires patient access and reads family members and family group, parses both server responses, handles auth/not-found/unavailable and renders member display name, role/relation and joined date. It contains no add/invite/remove/edit/member-switch action; the family surface is read-only in this page. Ownership and cross-family isolation require Backend tests.

## Insurance

Source: `app/[locale]/insurance/page.tsx`.

The page requires patient access and concurrently reads policy, benefits and claims, redirects on auth failure, treats forbidden/not-found as not-found and renders unavailable states if any response fails. It parses policy summary and claims, displaying policy status/company/plan and translated claim status/date. There is no claim submission, policy upload, preauthorization, eligibility check or checkout selection/action. This page proves insurance read visibility only, not integration with a booking/order quote or payment flow.

No Phase 0 remediation was made.
