# Nabdah Provider — Six-Locale Static Text Migration

**Date:** 2026-08-19  
**Scope:** Provider Expo source archive only; no production deployment.  
**Result:** **PASS for automatic static-text routing and build gates; human linguistic and visual sign-off remains open.**

## What Changed

The provider app contained a large number of direct presentation branches in the form `AR ? Arabic : English`. Those branches supplied Arabic or English only, so Urdu, Hindi, Bengali, and Filipino generally received English text even though the global language state supported all six locales.

This batch extracted every quoted direct Arabic/English text pair, generated the four missing locales in structured batches, validated every key and placeholder, and replaced the direct text branches with a local resolver call. Arabic remains Arabic; English remains English; Urdu, Hindi, Bengali, and Filipino now resolve through the new translation map.

| Measure | Result |
|---|---:|
| Affected source files | 49 |
| Converted static AR/EN text occurrences | 3,755 |
| Unique source-pair translations | 2,810 |
| Generated locale values | 11,240 (2,810 × 4) |
| Batch output rows | 113 / 113, zero generation errors |
| Key/order/empty-value validation | PASS |
| Placeholder preservation validation | PASS |
| Source direct-text branches remaining under the extracted pattern | 0 |

The generated source module is `src/i18n/providerTextTranslations.ts`. It exposes `translateProviderPair(locale, ar, en)` and declares the verified pair count (`2,810`). Each migrated component creates a local `tr(ar, en)` helper from its existing `lang` state. Layout choices such as `row-reverse`, text alignment, and Arabic-only RTL logic were intentionally not treated as translatable text.

## Verification Gates

| Gate | Result |
|---|---|
| Translation batch completion | **113 / 113 complete; 0 errors** |
| Strict key/order/non-empty validation | **PASS — 2,810 records** |
| TypeScript | **PASS — `npx tsc --noEmit`** |
| Provider contract tests | **PASS — 1 suite / 25 tests** |
| Static regression | **PASS — rejects any remaining extracted direct Arabic/English text branch** |
| Production-mode Expo web export | **PASS — 900 modules bundled** |
| Archive integrity | **PASS — no dependencies or build output included** |

## Archive Candidate

```text
NabdProvider-provider.zip
SHA-256: 539e18228857bf67d7b9ba7bfdd19c5db9920d527e5e9d0bf050c7796ce9d4f4
```

## Important Limits

1. **Machine translations are not human clinical localization approval.** The generated Urdu, Hindi, Bengali, and Filipino content requires fluent reviewer approval, especially medical, legal, insurance, financial, and consent language.
2. The migration covers the extracted **quoted direct AR/EN text-branch pattern**. Dynamic API text, server errors, push notifications, user-entered text, date/number formatting, and template-literal cases require their own source/contract review.
3. Direction and layout branches remain intentionally controlled by Arabic-only RTL. They require visual device testing in all six languages for truncation, wrapping, focus order, font coverage, large text, and orientation.
4. The web bundle increased as expected because the app now carries four additional language values. Production performance profiling and native-device checks remain mandatory.
5. This batch does not close any emergency, QR, consent, location, payments, security, backend contract, sandbox E2E, signed-build, or deployment-approval blocker.

> The static-text migration makes six-locale behavior source-addressable and regression-guarded. It is not a substitute for human language and device acceptance before release.
