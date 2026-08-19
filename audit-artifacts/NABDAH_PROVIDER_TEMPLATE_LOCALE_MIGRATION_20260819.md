# Nabdah Provider — Six-Locale Dynamic Template Migration

**Date:** 2026-08-19  
**Scope:** Provider Expo source archive only.  
**Result:** **PASS for 85 dynamic templates with equivalent runtime expressions; remaining asymmetric/legal templates require explicit review.**

## Problem Addressed

After static quoted AR/EN branches were migrated, the source still contained template literals such as:

```tsx
AR ? `Distance: ${distance}` : `Distance: ${distance}`
```

These templates can carry count, date, price, identifier, user-entered, or backend-provided values. A safe migration must translate the surrounding language while preserving the expressions exactly, rather than translating or serializing a runtime value.

## Implementation

| Measure | Result |
|---|---:|
| AR/EN template occurrences inspected | 97 |
| Templates with matching Arabic/English expression sequences | 85 |
| Unique templates translated | 82 |
| Batch generation rows | 5 / 5; zero errors |
| Placeholder validation | PASS — all `{0}`, `{1}`, etc. retained in each locale |
| Source files updated | 26 |

`src/i18n/providerTextTranslations.ts` now provides `translateProviderTemplate(locale, ar, en, values)`. It resolves Arabic and English directly, looks up Urdu/Hindi/Bengali/Filipino templates by source pair, and substitutes only numbered placeholders supplied by the original screen expression.

The migration intentionally excluded the templates whose Arabic and English expressions differ and the long provider-agreement content. These cases need a human source/contract decision; translating them mechanically could alter clinical, legal, or runtime semantics.

## Verification Gates

| Gate | Result |
|---|---|
| Batch output | **5 / 5 complete; 0 errors** |
| Placeholder/key/non-empty validation | **PASS — 82 records** |
| TypeScript | **PASS** |
| Provider contract regression | **PASS — 1 suite / 26 tests** |
| Template regression | **PASS — no remaining equivalent-expression AR/EN template branch** |
| Production-mode Expo web export | **PASS — 900 modules bundled** |
| Archive integrity | **PASS** |

## Archive Candidate

```text
NabdProvider-provider.zip
SHA-256: 9230d7d84d47bcf30519fbb74e700e754510d235c89073ce0d4fdea43c5ff1f8
```

## Open Localization Decisions

1. Ten templates use different expressions by locale (for example `.ar`/`.en` fields or Arabic-specific status conditionals). Each must be redesigned to pass a locale-neutral value or an explicitly localized server value.
2. The provider service-agreement content and other legal/contract surfaces require owner legal/product approval before generating or presenting translations; this is not an automatic translation task.
3. Dynamic API responses, push notifications, server error messages, dates/numbers, accessibility labels, visual wrapping, font coverage, and RTL/LTR device behavior remain subject to source and human acceptance review.

No deployment, account mutation, medical action, payment, legal consent, or production data access occurred in this batch.
