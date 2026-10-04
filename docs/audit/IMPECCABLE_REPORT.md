# Impeccable design-quality report — read-only audit

**Branch:** `chore/impeccable-setup` (from `main` 7fd81e8)
**Tool:** Impeccable v4.1.0 (engine v0.1.11, darwin-x64), dev-only, `--no-hooks`
**Scope:** `patient-web/` (detector + manual), `patient-app/` (manual only — the detector does not cover React Native)
**No code was changed.**

> **Version note:** the task asked for `impeccable@4.5.0`. That version does not exist on npm; the latest published is **4.1.0**, which is what is installed and recorded in `docs/tooling.md`.

---

## Detector results — patient-web

**33 findings, all verified against the source.**

| Rule | Count | Severity | Verdict |
| --- | --- | --- | --- |
| `side-tab` | 31 | **P1** | **Real.** The owner confirmed side-tab is **not** in `docs/design/canvas/`. Every instance is a thick coloured border on one side of a card/notice. |
| `layout-transition` | 1 | P2 | Real. |
| `bounce-easing` | 1 | P2 | Real. |

**Zero `locale` findings.** An early count of 22 was a false positive: `grep "\[locale\]"` matched the `[locale]` segment in every file path, not the rule tag. Filtering on `line N: [locale]` returns 0.

### The side-tab pattern (all 31)

Every instance is the same construct — a `.notice` or `.boundary` block with a 3–4 px coloured left border:

```css
.notice {
  border: 1px solid #E8EDEE;
  border-inline-start: 3px solid #5FD9B3;   /* ← the finding */
  ...
}
```

Files: `appointments/[appointmentId]/appointment-detail.module.css:21`, `articles/articles.module.css:31`, `chat/chat.module.css:22`, `diagnostics/diagnostics.module.css:61`, `family/family.module.css:21`, `health/health.module.css:29`, `home-care/home-care.module.css:37`, `medicines/[medicineId]/medicine-detail.module.css:19`, `medicine-catalog/medicine-catalog.module.css:36`, `settings/settings.module.css:18`, `settings/security/security.module.css:17`, and 20 more.

**Fix (per DESIGN.md §4/§6):** remove the side bar; use a hairline border (`--nabd-color-border`) or a small tinted status chip.

---

## Manual findings — patient-web

| Finding | Severity | Evidence |
| --- | --- | --- |
| Raw hex colours in inline styles | **P2** | 1,699 occurrences in `.tsx` files. Sample: `patient-web/app/[locale]/labs/[testSlug]/[citySlug]/page.tsx:133` — `style={{ color: "#6B7C6E", fontSize: "1rem" }}`. Violates DESIGN.md §2 ("no raw hex in components"). |
| Emoji in UI | — | **0 found.** Compliant with DESIGN.md §5. |

---

## patient-app — manual only

The detector returned **0 findings** for `patient-app/` because it scans CSS and the app is React Native (`StyleSheet`). This is a **coverage gap, not a clean bill of health.**

The checklists (safe areas/notch, hard-coded colours vs tokens, emoji, touch targets <44 px, missing states, RTL, font scaling, reduce-motion) were **not applied** — the budget of ~15 representative screens per app was consumed by the patient-web detector verification and the raw-hex sweep.

**This is the largest gap in this report and is recorded as such rather than assumed clean.**

---

## Conflicts with DESIGN.md

None of the 33 detector findings conflict with DESIGN.md. The side-tab rule is a generic AI-slop detector; DESIGN.md §4 specifies cards with "a hairline border" and §9 prohibits "cards inside cards" but says nothing that approves a thick side bar. The owner's confirmation that side-tab is absent from the canvas settles it.

---

## Severity summary

| Severity | Count | |
| --- | --- | --- |
| **P0 blocker** | 0 | |
| **P1** | 31 | side-tab (all confirmed real) |
| **P2** | 3 | layout-transition, bounce-easing, raw-hex-in-inline-styles |
| **Total** | 34 | |

---

## What this report does not claim

- It does not claim patient-app is clean — the detector cannot see it and the manual checklist was not run.
- It does not claim the 1,699 raw-hex occurrences are all in rendered style values; they are in `.tsx` files and a sample confirms inline styles, but the count includes any hex literal.
- It does not run `/impeccable audit`, `critique`, `harden` or `adapt`. Those are LLM-driven commands that require the skill loaded in an agent session; they are not CLI commands and were not faked here.
