# Phase 0B semantic evidence — Saudi phone validator

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/common/validators/saudi-phone.validator.ts:1–26`

`IsSaudiPhoneConstraint` is a synchronous class-validator constraint. It rejects a falsey value and applies an anchored regular expression accepting prefixes `009665`, `9665`, `+9665`, `05` or `5`, a second digit from a listed set, and seven ASCII digits (`3–9`). The decorator factory registers this constraint against the target property and forwards optional validation options (`16–25`).

The anchored pattern provides a basic Saudi-mobile shape check and does not accept arbitrary trailing input. It does not trim whitespace, normalize Arabic-Indic/Eastern Arabic digits, handle separators/parentheses, enforce a string runtime type before regex use, or validate carrier allocation, line status, country context or duplicate-account policy (`5–9`). The falsey check does not describe behavior for objects/numbers when invoked outside normal class-validator transformation (`5–6`).

The validator's default message includes a phone-format example; no redaction/logging/PII policy or OTP abuse/rate-limit boundary is present in this member (`11–13`). No direct test is included for accepted/rejected formats, Unicode, whitespace, type confusion, nullability, international formatting, leading zero equivalence or downstream normalization. No code was changed and no build/test/application operation was performed during this read.
