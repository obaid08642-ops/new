# Phase 0B non-code asset reconciliation

`src/assets/fonts/NotoNaskhArabic-Bold.ttf` is a binary font asset, not a semantic source member. It was verified from the baseline archive by file identification and SHA-256 only:

- Type: TrueType font, confirmed by `file`.
- SHA-256: recorded in the audit command output for this reconciliation.
- No source semantics, routes, DTOs, ownership, state transitions or runtime behavior can be inferred from the binary asset.
- No product code was changed and no build/test/application operation was performed.

- `src/assets/fonts/Amiri-Regular.ttf`: TrueType font; SHA-256 `2444788b85996d795f0db7e14f3f6bfc3ea1c985e391267db0269b9e40f3447d`; reconciled as N/A for semantic source reading.
