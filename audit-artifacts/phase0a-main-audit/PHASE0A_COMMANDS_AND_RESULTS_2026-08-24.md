# Phase 0A Commands and Results

**Baseline:** `22526bedb77a3d8148219036367e4714f401aecc`  
**Audit branch at verification:** `agent/audit-main-contract-inventory`

## Source extraction

The five archive bytes were extracted with this command pattern, where `<archive>` is the exact path from the baseline tree:

```sh
git show 22526bedb77a3d8148219036367e4714f401aecc:<archive> > audit-artifacts/phase0a-main-archives/22526bedb77a3d8148219036367e4714f401aecc/<archive>
unzip -tq <archive>
unzip -q <archive> -d <archive-without-.zip>
```

No working-tree archive or later-branch archive was used.

## Integrity and archive results

| Archive | SHA-256 | Members | `unzip -tq` |
|---|---|---:|---|
| `NabdProvider-provider.zip` | `4655c5c018e403c3ab3eb8c13645d876cc7f69b73f5ba6dd9050186917c92d4c` | 83 | PASS |
| `nabd-patient-web.zip` | `807237bb57c09964e13698c650b4258547ab280df48f2913d0179a16e6977ad5` | 1126 | PASS |
| `nabd_plus_patient_app.zip` | `70d01d4857e5326e17f3f3c14f35b20b4bbdbf775919d12bc7e280c24a84964b` | 665 | PASS |
| `nabdah-backend.zip` | `3ca5113e2f1b96ad1f9fd647e7a2e0a0727a6cff4850cf2a177d3c647bc5d36d` | 1188 | PASS |
| `web_admin_dashboard.zip` | `b32648f90eadcf7520644f77398bd99e9c2660ddde2e27bab160b5faaac65b82` | 66 | PASS |
| **TOTAL** | — | **3128** | — |

## Inventory results

The generated member inventory contains `3,128` data rows: `2,962` owned source/config candidates and `166` exclusions (`123` binary and `43` other generated/dependency/non-source classifications). Every row has archive/member path, SHA-256, line count where readable, kind, role, domain, status and `Fully read`.

The generator deliberately records `Fully read=YES: 0` and `Fully read=NO: 3,128`. File names, grep, counts and line counts are not semantic reading. The source manifest is therefore inventory-complete but semantic-full-read incomplete and must not be treated as accepted Root Audit closure.

## Severity recount

```sh
awk -F'|' '$2 ~ /F-[0-9]+/ {gsub(/[[:space:]]/,"",$3); c[$3]++} END {for (k in c) print k, c[k]}' audit-artifacts/phase0-main-audit/confirmed-findings-v1.md | sort
awk -F'|' '$2 ~ /F-[0-9]+/ {n++} END {print n}' audit-artifacts/phase0-main-audit/confirmed-findings-v1.md
```

Observed output:

```text
P0 3
P1 88
P2 7
98
```

## Delivery gates

The final delivery verification command is:

```sh
git diff --check
git status --short
git rev-parse HEAD
git ls-remote origin refs/heads/agent/audit-main-contract-inventory
```

The branch must be pushed with artifacts only, the local and remote heads must match, `git diff --check` must be clean, and `git status --short` must return no output. Any remaining owned source member with `Fully read=NO` keeps Phase 0A in `NO-GO` status.

## Secret-scan interpretation

The broad heuristic scan returned five matches in the pre-existing audit artifact `audit-artifacts/phase0-main-audit/nabdah-backend-surface-index.txt`. The matches are embedded historical E2E test fixtures (`*.test.sa`, localhost `127.0.0.1`, and passwords such as `Str0ng!Pass`, `Adm1n!Pass`, and `Test!23456`); they are not credentials loaded from an environment or production secret store. They remain a review finding because test credentials are committed as historical source evidence, but they are not classified as live secret leakage.

A targeted private-key/access-token scan over the Phase 0A artifacts returned no private-key header, AWS access-key, GitHub token or OpenAI-style secret. The general password heuristic therefore requires reviewer awareness of the five test-fixture lines rather than a false claim of a clean all-text scan. No source or production file was modified to suppress the matches.
