# Phase 8 — Batch AM: patient shared UI accessibility and RTL foundation

## Purpose

The patient app’s shared button already provided basic semantic state but did not set content direction within the button based on active language and did not enlarge its tappable area. Interactive shared cards also had no explicit semantic role or touch margin. Because these components are reused across patient workflows, the improvement raises a bounded, measurable accessibility baseline without changing care, payment or record contracts.

## Source change

| Surface | Implemented control |
|---|---|
| Shared button direction | Button content now uses right-to-left ordering for Arabic and Urdu and left-to-right ordering for remaining supported languages. |
| Touch accessibility | Gradient and non-gradient button variants provide a six-point hit slop; interactive cards provide a four-point hit slop. |
| Semantics | Shared buttons retain explicit role/label/disabled/busy state; clickable cards now declare button role. |
| Regression coverage | A lightweight source contract asserts semantic role/state, language-aware direction and shared touch-target expansion. |

## Verification

| Gate | Result |
|---|---|
| Patient focused UI/i18n contracts | **PASS** — 3/3. |
| Patient full test suite | **PASS** — full Jest command completed. |
| Patient TypeScript | **PASS** — `npx tsc --noEmit`. |
| Patient production web export | **PASS** — Expo web bundle completed. |
| Patient archive integrity | **PASS** — `unzip -tq`; SHA-256 `89b11155f1e2161fa6644a868a59dda33b76c611f3a84787bb2a888f19df6040`. |
| Branch upload | **PASS** — archive commit `339404f` (`fix: improve patient shared control accessibility`) is pushed to `manus/on-live-reconciliation`. |

## Acceptance limits

The controls are source-validated common components. This work does not prove every screen’s layout, contrast, translation quality, assistive technology behavior, focus order or touch behavior on actual devices. Those are separate Phase 9–11 acceptance duties and must be evidenced before release.
