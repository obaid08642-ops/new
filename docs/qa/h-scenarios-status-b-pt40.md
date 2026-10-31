# H scenarios, status B: PT-40 (patient app side)

| ID | Scenario | Status after | Evidence | Notes |
|---|---|---|---|---|
| PT-40 | Accessibility basics (labels, focus, contrast), app side | PARTIAL | `patient-app/src/__tests__/a11y/shared-components.test.tsx` (new, 18 tests, light and dark); `a11y/screens-audit.test.tsx` (new, 4 tests); `a11y/audit.ts` (helper) | Roles, names, 44pt and state-not-colour measured on the shared components and 3 screens; no gap found, so no component changed; focus order, RTL and contrast not measurable in jest |

## What exists
Shared components in `packages/ui-native/src/components` already set `accessibilityRole`, `accessibilityLabel` and `accessibilityState`, and reach 44pt with `minHeight` or `hitSlop` (Button sm 40 + slop, Segmented sm 38 + slop, Toggle 30 + slop, Stepper discs 30 + slop, Search clear/scan 28/36 + slop).

## What I tested
- Components (both themes): Button sm/md/lg/busy, IconButton (44 by 44), Segmented (radiogroup, radio per option in option order, checked state, 44pt), Toggle (switch, checked, 44pt), Radio row (role, label with meta, checked, 44pt), Input (named by label, error announced as alert and shown as text), Search (field label; clear, scan and filter are named buttons reaching 44 by 44), Stepper (both buttons named, 44 by 44), StatusChip (meaning is text).
- Screens, with TEST answers, every pressable host element checked for role, name (label or visible text) and, where the element declares a height, 44pt: insurance hub (policy tab), family member (health tab), order with a prescription (photo way). The audit helper is itself tested against a bad pressable (flags role, name and size).

## What I fixed
Nothing: no failing case was found in the audited set.

## Limits (not verified)
- Only 3 screens were audited, not the 6 asked: the other candidates (home, consultations list, orders list, cart) need heavy provider/selected-address mocks; the helper `auditPressables(screen.toJSON())` is ready to be applied to them.
- A pressable that sizes itself from its content has no declared height and is skipped by the size check; those need a device measurement.
- Focus order and RTL: only option order inside a group is asserted (DOM order); real screen-reader focus order and mirrored layouts need a device. Colour contrast is not measured here (tokens only, no new colours).
- Raw colour in `packages/ui-native/src/components/Inputs.tsx:238` (`#D42A38` inside Select) predates this work and is in the client-token-sync baseline; not touched.
- Web side (D) of PT-40 is out of scope of this task.
