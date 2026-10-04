# Agent progress — Phase 12

Branch `p12-design`. Base `9888230`. Phase 12 work is **stopped** pending the
owner's word for X0, per the reviewer, 2026-10-04.

## NEEDS_ASSET — icons the curated set does not contain

**32 screens. Do not draw these — they are the designer's to supply.** The curated
set is not extended by invention: every name in it is proved to exist in
`@phosphor-icons/react`'s real exports by `tools/design/icon-set-parity.mjs`, which
rejects a name Phosphor does not export. Eleven candidate mappings were rejected on
that basis in `caf5555`, so the list below is short *because it is verified*, not
because it is small.

Each row is what the screen asks for today, in lucide's vocabulary. The designer
should say which name it becomes, and supply the shape.

| # | screen | needs |
| --- | --- | --- |
| 1 | `settings/language/page.tsx` | Languages |
| 2 | `settings/feedback/page.tsx` | MessageSquare |
| 3 | `settings/page.tsx` | MonitorSmartphone |
| 4 | `settings/help/page.tsx` | HelpCircle |
| 5 | `home-nursing/[citySlug]/page.tsx` | HeartHandshake |
| 6 | `health/timeline/page.tsx` | FileClock |
| 7 | `doctor/[slug]/page.tsx` | BadgeCheck |
| 8 | `family/chat/page.tsx` | MessagesSquare |
| 9 | `emergency/page.tsx` | ShieldAlert |
| 10 | `loyalty/page.tsx` | Award |
| 11 | `dashboard/page.tsx` | LifeBuoy |
| 12 | `nursing/nurses/[nurseId]/page.tsx` | Award |
| 13 | `profile/page.tsx` | BadgeCheck |
| 14 | `support/support-client.tsx` | HelpCircle, LifeBuoy, MessageSquarePlus |
| 15 | `support/ticket/page.tsx` | LifeBuoy, MessageSquare |
| 16 | `support/page.tsx` | HelpCircle, LifeBuoy |
| 17 | `voice/page.tsx` | HeartHandshake, ShieldAlert |
| 18 | `consultations/doctors/[doctorId]/page.tsx` | BadgeCheck |
| 19 | `consultations/doctors/page.tsx` | BadgeCheck |
| 20 | `cart/prescription/page.tsx` | FileCheck2 |
| 21 | `mental-health/crisis-contacts/page.tsx` | HeartHandshake |
| 22 | `mental-health/page.tsx` | HeartHandshake |
| 23 | `nutrition/daily-tracker/page.tsx` | Droplets, Salad |
| 24 | `nutrition/plan/page.tsx` | Salad |
| 25 | `nutrition/log-meal/page.tsx` | Salad |
| 26 | `nutrition/page.tsx` | Droplets, Salad |
| 27 | `insurance/submit-claim/page.tsx` | FileCheck2 |
| 28 | `insurance/page.tsx` | FileCheck2 |
| 29 | `insurance/claims/page.tsx` | FileCheck2 |
| 30 | `notifications/settings/page.tsx` | ShieldAlert |
| 31 | `notifications/page.tsx` | ShieldAlert |
| 32 | `p/[slug]/page.tsx` | Beaker, Layers, Barcode |


Two of these were already offered to the reviewer in the icon batch and rejected on
the ground that Phosphor does not export them: **`MessageSquare`** (Phosphor has
`ChatSquare`, not `MessageSquare`) and **`Award`**/`LifeBuoy`/`Salad`/`Droplets`/
`Languages`/`Beaker`/`Layers`/`MessagesSquare`/`MessageSquarePlus`/`FileClock`.
`Languages` and `MessageSquare` appear here, so either a different Phosphor
component is acceptable to the designer, or these two screens keep lucide until it
is.

## Also open, and not icons

- **62 screens still import `lucide-react`.** 32 are the table above; 16 hold an
  icon in a local alias (`isRtl ? ArrowLeft : ArrowRight`) and are migrated by hand;
  11 are blocked by a colour literal; 4 are blocked by `fill`, now added in `fb96580`
  and awaiting use.
- **`#1e332e`, 726 uses: no automatic migration.** Decided per context during the
  screen rebuild, per the reviewer.
- **`packages/ui` has 24 references to custom properties that were never emitted**
  (`--nabd-color-border-default`, `--nabd-font-size-bodyStrong`,
  `--nabd-font-family-body`). Pre-existing, baselined by
  `tools/design/token-css-usage.mjs`, and deliberately not fixed: those components
  cannot be type-checked or rendered while `@phosphor-icons/react` is missing.
