# Phase 2 manual findings batch 01

The comparison confirms that the main-default policy must be applied file-by-file rather than archive-by-archive.

## Nutrition

`main/app/nutrition/ai-plan-builder.tsx` is a real multi-step feature. It validates weight, height, and age, calls `POST /ai/generate-diet-plan`, persists nutrition profile values through `POST /nutrition/profile`, and exposes generated plan output and exercise-plan navigation. The QA counterpart is only a redirect to `/nutrition/hub`, which is safer than an unverified feature but removes the requested functionality. Decision: retain main feature with a contract/safety gate; do not replace it with the redirect wholesale.

`main/app/nutrition/hub.tsx` is a broad feature directory but has no data loading. QA `nutrition/hub.tsx` calls `/nutrition/profile` and `/nutrition/daily-summary` with loading/error/retry states but exposes a much narrower set of actions. Decision: retain main navigation breadth and later merge verified QA data-state behavior without dropping feature routes.

## Maternity

`main/app/maternity/hub.tsx` has the richer pregnancy/cycle/checkup/planning journey, but when backend data is absent it falls back to AsyncStorage and can synthesize a default pregnancy profile with week 28 and a due date derived from `Date.now()`. It also performs optimistic local status/checkup updates before backend confirmation. This is not acceptable as medical truth. QA `maternity/hub.tsx` is narrower and fail-closed with `/maternity/profile`, explicit loading/error/empty states, and no fabricated profile. Decision: keep the main breadth but require a merged safe data policy; remove synthetic medical defaults and reconcile optimistic transitions before activation.

## Diagnostics

`main/app/diagnostics/booking-confirm.tsx` preserves the full home-vs-lab, payment, insurance, cart, confirmation, and tracking journey, but contains hardcoded address/coordinates, a fixed home fee and VAT calculation, a provider fallback ID, a fabricated example document URL, and a Date.now-derived appointment. QA deliberately redirects away from checkout because availability and payment contracts are not verified. Decision: retain main as the intended UX specification but block live activation until provider availability, pricing, address, document storage, payment, insurance, and scheduling contracts are verified; no fabricated defaults may reach a real booking.

These findings are evidence for `MERGED` or `BLOCKED` decisions, not permission to copy an entire alternative archive or to patch source silently.
