# Phase 0B semantic evidence — Saudi National ID/Iqama validator

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/common/validators/iqama.validator.ts:1–42`

`IsIqamaConstraint` is a synchronous class-validator constraint. It rejects falsey input, requires ten digits beginning with `1` or `2`, then applies a modulo-10 checksum by doubling even-index digits, subtracting nine when the doubled value exceeds nine, summing all digits and accepting a zero remainder (`3–25`). The decorator factory registers the constraint with optional validation options (`32–41`).

The anchored ASCII-oriented pattern and checksum provide a basic structural check. The member does not trim or normalize whitespace/separators, convert Arabic-Indic digits, explicitly enforce runtime string type before regex/character parsing, distinguish National ID from Iqama beyond the first digit, validate issuing authority/status/expiry, prevent duplicate identity linkage or define account ownership policy (`5–24`). The checksum proves format consistency only, not that an identity exists or belongs to the actor.

The default message discloses the expected identity type/format but no redaction, logging, failed-attempt, enumeration or retention policy is visible (`27–29`). No direct tests cover known valid/invalid fixtures, checksum boundaries, Unicode/confusables, type confusion, normalization, optional-field semantics, repeated failures or integration with onboarding/OTP/provider verification. No code was changed and no build/test/application operation was performed during this read.
