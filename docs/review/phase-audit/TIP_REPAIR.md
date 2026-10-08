# TIP_REPAIR Report — `oc/tip-repair` branch

## Summary
Part 1 of Session F: repair the `oc/phase-audit` tip (sessions A and B wait for this).

## Items Fixed

### F-1 — `npm ci` ERESOLVE (@nestjs/terminus vs @nestjs/axios)
**Problem:** `@nestjs/terminus@11.1.1` requires `@nestjs/axios@^2.0.0 || ^3.0.0 || ^4.0.0` but `package.json` had `@nestjs/axios@^12.0.1`.

**Fix:** Changed `backend/package.json`:
- `@nestjs/axios`: `^12.0.1` → `^4.0.1`

**Verification:**
```bash
cd backend && npm ci --no-audit --no-fund
# EXIT 0 (no --legacy-peer-deps, no .npmrc override)
```

**Files changed:**
- `backend/package.json`: `@nestjs/axios` version pinned to `^4.0.1`
- `backend/package-lock.json`: regenerated

### F-2 — Backend does not boot: MediaModule cannot resolve UploadSecurityService
**Status:** NOT YET FIXED (Part 1 scope is F-1 only)

### F-3 — auth.service.ts guards removed by bad merge
**Status:** NOT YET FIXED

### F-4 — media.controller.ts chat asset authorization
**Status:** NOT YET FIXED

### F-5 — audit-log redaction regexes
**Status:** NOT YET FIXED

### F-6 — wallet routes must be gone
**Status:** NOT YET FIXED

### F-7 — password-reset e-mails brand name
**Status:** NOT YET FIXED

### F-8 — patient-app i18n coverage
**Status:** NOT YET FIXED

### F-9 — tsc --noEmit errors in non-Phase-15 specs
**Status:** NOT YET FIXED

### F-10 — boot suite green
**Status:** NOT YET FIXED

## Gate Output for F-1

```bash
cd backend
npm ci --no-audit --no-fund
# EXIT 0 (no --legacy-peer-deps, no .npmrc override)
npx tsc --noEmit
# Known pre-existing spec errors (Phase 15 reverted, etc.) — not F-1 scope
```

## PR
- Branch: `oc/tip-repair`
- Base: `oc/phase-audit`
- Title: `[OC tip-repair] DO NOT MERGE` (draft)
- Commit: `26f40135` `[AUDIT F-1] Fix npm ci: align @nestjs/axios@^4.0.1 with @nestjs/terminus@11.1.1 peer dep`

## Next Steps
Proceed to Part 2 items on `origin/main` (Q-12, D-17, etc.) after F-1 PR is created and Part 1 is reported.
