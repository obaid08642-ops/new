# Phase 0B semantic evidence — slug utilities

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/common/slug.util.ts:1–47`

The file defines an Arabic transliteration map, `slugify`, `buildSlug` and `parseSlugSuffix` (`13–47`). `slugify` returns `item` for falsey input, lowercases and maps Arabic characters, keeps ASCII lowercase letters/digits, converts all other characters to dashes, collapses/trims dashes and slices to a default maximum of 60 characters (`21–33`). `buildSlug` appends the first six hyphen-stripped lowercase characters of the supplied ID (`35–40`). `parseSlugSuffix` extracts a trailing six-character hexadecimal segment (`42–47`).

The deterministic ASCII-oriented behavior is useful for stable URL fragments. Transliteration is explicitly rough and does not cover Arabic marks, Persian letters, non-Arabic Unicode, diacritics, locale-specific case or confusable characters (`13–29`). Invalid/falsey input falls back to `item`, creating generic collisions unless callers add a namespace (`21–22,30–33`). Slicing after dash normalization can leave awkward/truncated words and does not reserve space for a suffix when used independently (`30–32`).

The six-character ID prefix is not guaranteed unique, cryptographically opaque or collision-safe; `buildSlug` does not validate ID format or presence and can produce a trailing hyphen (`35–40`). `parseSlugSuffix` only accepts hex suffixes although `buildSlug` accepts arbitrary IDs, so generation and parsing are not fully symmetric (`36–46`). No database uniqueness, canonical redirect, collision resolution, tenant/entity namespace, slug immutability or URL authorization policy is visible. No tests cover Unicode/Arabic, collisions, max length, malformed IDs, SEO canonicality, route lookup or enumeration. No code was changed and no build/test/application operation was performed during this read.
