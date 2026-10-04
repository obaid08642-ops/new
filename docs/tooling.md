# Tooling

## Impeccable — design-quality detector

**Version:** 4.1.0 (engine v0.1.11, darwin-x64)
**Scope:** dev-only. Not a production dependency. Installed with `--no-hooks`.
**License:** Apache-2.0 (`pbakaus/impeccable`)

> The task asked for `impeccable@4.5.0`; that version does not exist on npm. The latest
> published version is 4.1.0, which is what is installed here.

### Run the detector

```bash
# scan a directory
npx impeccable@4.1.0 detect patient-web/

# scan a single file
npx impeccable@4.1.0 detect patient-web/app/[locale]/page.tsx

# CI-friendly JSON on stdout
npx impeccable@4.1.0 detect --json patient-web/

# scan a live URL (uses an installed Chrome/Chromium/Edge)
npx impeccable@4.1.0 detect http://localhost:3000
```

Findings go to **stderr**; redirect with `2> findings.txt`. Exit codes: `0` = no primary
findings, `2` = primary findings present, `1` = a target could not be scanned.

### What it catches

61 deterministic rules across AI slop (side-tab borders, purple gradients, bounce easing,
dark glows) and general design quality (line length, cramped padding, small touch targets,
skipped headings). **No LLM and no API key** — the rules run locally.

### Known coverage gap

The detector scans **CSS**. `patient-app/` is React Native (`StyleSheet`) and returns
**0 findings** — a coverage gap, not a clean bill of health. RN must be checked manually.

### Design authority

`PRODUCT.md` and `DESIGN.md` at the repo root are the source of truth. **DESIGN.md
decisions override any generic Impeccable rule** (glass, coloured shadows, coral/lime
usage, service icon tiles are approved — never remove or "simplify" them).

See `docs/audit/IMPECCABLE_REPORT.md` for the audit this tool produced.
