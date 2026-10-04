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
| `bounce-easing` | 1 | — | **IGNORED — approved press token** (`patient-web/app/design-tokens/tokens.css:165`, `--nabd-motion-easing-press: cubic-bezier(0.34, 1.56, 0.64, 1)`; DESIGN.md §7). |

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
| Raw hex colours in components | **P1** (blocks dark mode: a literal colour cannot follow the theme) | **2,909 hex literals in 203 `.tsx` files; 1,405 of them on inline `style={{…}}` lines.** Sample: `patient-web/app/[locale]/labs/[testSlug]/[citySlug]/page.tsx:133` — `style={{ color: "#6B7C6E", fontSize: "1rem" }}`. Violates DESIGN.md §2 ("no raw hex in components"). |
| Emoji in UI | — | **0 found.** Compliant with DESIGN.md §5. |

---

## patient-app — manual only

The detector returned **0 findings** for `patient-app/` because it scans CSS and the app is React Native (`StyleSheet`). This is a **coverage gap, not a clean bill of health.**

Targeted manual checks (code search, verified):

| Finding | Severity | Evidence |
| --- | --- | --- |
| `SafeAreaView` imported from `react-native` (iOS-only; no insets on Android) | **P1** | `patient-app/app/room/[id].tsx:3` (used at :179). Fix: import from `react-native-safe-area-context`. |
| Raw hex colours | **P1** (blocks dark mode) | 2,204 hex literals in 162 files (design-session count). Reviewer reproduction with `#[0-9A-Fa-f]{3,8}` over `.tsx` only: 2,018 in 190 files; the method differs, the conclusion does not. |
| Reduce-motion respected only in `src/components/NabdLogo.tsx` | P2 | No other file reads `useReducedMotion` / `isReduceMotionEnabled`. |
| Emoji in UI | — | **0** (emoji appear only in code comments). |
| Safe-area handling | — | Present in 185 files (`useSafeAreaInsets` / `SafeAreaView` / `SafeAreaProvider`). |

**Still pending:** the full manual React Native checklist (touch targets < 44 px, missing loading/empty/error states, RTL, font scaling, per-screen safe areas) has **not** been run. Until it is, patient-app is not assessed as clean.

---

## Conflicts with DESIGN.md

None of the 33 detector findings conflict with DESIGN.md. The side-tab rule is a generic AI-slop detector; DESIGN.md §4 specifies cards with "a hairline border" and §9 prohibits "cards inside cards" but says nothing that approves a thick side bar. The owner's confirmation that side-tab is absent from the canvas settles it.

---

## Severity summary

| Severity | Count | |
| --- | --- | --- |
| **P0 blocker** | 0 | |
| **P1** | 34 | side-tab ×31 (web), raw hex (web), raw hex (app), `SafeAreaView` from `react-native` (app) |
| **P2** | 2 | layout-transition (web), reduce-motion only in NabdLogo (app) |
| Ignored | 1 | bounce-easing: approved press token |
| **Total** | 36 | |

---

## What this report does not claim

- It does not claim patient-app is clean — the detector cannot see it and only the targeted checks above were run; the full manual RN checklist is still pending.
- It does not claim every one of the 2,909 web hex literals is a rendered style value; 1,405 sit on inline-style lines, the rest include constants and props.
- It does not run `/impeccable audit`, `critique`, `harden` or `adapt`. Those are LLM-driven commands that require the skill loaded in an agent session; they are not CLI commands and were not faked here.
