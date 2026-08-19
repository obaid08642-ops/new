# Nabdah Provider — Six-Locale Shared Foundation

**Date:** 2026-08-19  
**Scope:** Provider-app source only, isolated from production.  
**Result:** **PASS for the shared-language foundation; NOT a release-level localization sign-off.**

## Purpose and Scope

The provider application previously exposed a typed shared translation dictionary and persisted language selection for Arabic and English only. This batch establishes the common six-language foundation required by the product: Arabic (`ar`), English (`en`), Urdu (`ur`), Hindi (`hi`), Bengali (`bn`), and Filipino (`fil`).

The work is intentionally limited to the **99 shared UI keys** in `src/constants/index.ts`. It does not claim that every provider screen, accessibility label, validation path, push notification, server error, or rich workflow has already received a human-approved six-language translation. Those screen-level migration and human-review tasks remain open.

## Source Changes

| Area | Change | Result |
|---|---|---|
| Typed language model | Expanded `Lang` from `ar/en` to `ar/en/ur/hi/bn/fil`. | All six locale identifiers are valid application state. |
| Shared dictionary | Added `src/i18n/sharedLocales.ts` with complete Urdu, Hindi, Bengali, and Filipino blocks for the 99 shared keys that already existed in Arabic and English. | Each added locale contains the same key set as Arabic, including `haveAccount`. |
| Device detection | `LangProvider` now maps supported device locale codes to their matching language and safely falls back to English for all other codes. | Six supported device locales resolve without an AR/EN-only branch. |
| Persisted preference | Saved `APP_LANG` values are accepted only when they are one of the six typed locale codes. | Unknown/stale values do not become application language state. |
| Directionality | Every persistence and explicit `set()` path uses `I18nManager.forceRTL(language === 'ar')`; exposed `isRTL` remains `lang === 'ar'`. | Urdu, Hindi, Bengali, and Filipino remain LTR by contract; Arabic alone is RTL. |
| Language toggle | Replaced the prior Arabic/English binary toggle with a deterministic cycle: `ar → en → ur → hi → bn → fil → ar`. | All six languages are reachable through the existing toggle action. |
| Regression contract | Added a source-level Jest contract asserting the complete `Lang` union, matching key sets across Urdu/Hindi/Bengali/Filipino, shared dictionary inclusion, six-language cycle declaration, and Arabic-only RTL expressions. | Prevents an AR/EN regression or partial shared locale block from passing silently. |

## Translation Integrity Controls

The 99-key seed was extracted from the actual Arabic and English shared dictionary. A strict JSON-schema batch generated the four missing locale values. A validator then enforced the following before any source module was built:

| Control | Outcome |
|---|---|
| Arabic/English source key parity | **PASS — 99 keys** |
| Output rows and strict JSON fields | **PASS — 99 rows; `ur`, `hi`, `bn`, `fil` all present** |
| Empty values | **PASS — none** |
| Locale-script sanity check | **PASS — no gaps** |
| Key-set equality per added locale | **PASS — confirmed by Jest regression test** |
| Human linguistic, clinical, regional, and visual review | **OPEN — mandatory before store release** |

The generation process preserved the Nabd Plus brand and shared abbreviations such as IBAN, SCFHS, CR, SAR, and km. It is not a substitute for review by fluent product/clinical reviewers.

## Verification Gates

| Gate | Command | Result |
|---|---|---|
| Static types | `npx tsc --noEmit` | **PASS** |
| Provider contract regression | `npm test -- --runInBand` | **PASS — 1 suite / 20 tests** |
| Production-mode web bundle | `CI=1 EXPO_NO_TELEMETRY=1 NODE_ENV=production npx expo export --platform web --no-bytecode --max-workers 1 --clear` | **PASS — 899 modules bundled** |
| Archive integrity | `unzip -t` and excluded-directory inspection | **PASS — no `node_modules`, `dist`, `coverage`, or `.expo` entries** |

## Archive Candidate

The resulting source archive is ready to replace the provider archive in the reconciliation branch:

```text
NabdProvider-provider.zip
SHA-256: 8dbd573c4e3e83ccadb815a257b6692ed1d78d6a437506c4a8ccbb5e298818ac
```

## Explicit Boundaries and Remaining Work

No production deployment, EAS build, signed APK/IPA, real-device test, or production-data mutation occurred in this batch. The following remain release blockers:

1. Inventory and migrate the approximately 49 provider source files that still contain AR/EN-specific presentation branches; no claim of complete screen-level six-locale coverage is made here.
2. Conduct fluent human review of every locale, including medical terminology, truncation, font coverage, keyboard behavior, error messages, and accessibility labels.
3. Validate Arabic RTL and each LTR locale on supported Android and iOS devices, including orientation, large text, and dark/light themes.
4. Complete the existing source-contract, deployment-approval, sandbox E2E, payment activation, consent/QR/location approval, and physical-device blockers before revising the overall GO/NO-GO decision.

## Evidence Files

The isolated verification logs were retained during execution as:

- `provider-six-locale-tsc.log`
- `provider-six-locale-test.log`
- `provider-six-locale-expo-export.log`
- `provider-six-locale-zip-test.log`

These logs are execution evidence, while this document is the committed audit record.
