# Nabd Phase 0A.1 Delivery Pointer

**Baseline under audit:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`
**Audit branch:** `agent/audit-main-contract-inventory`
**Index artifact generated from:** `480abfccb84de9b73bbf0dcac04b2f89057f0de1`
**Important:** The value above identifies the commit from which the prior index snapshot was generated; it is not a claim about the current branch head. A branch head is time-dependent and must be taken at delivery time.

## Current content hashes at pointer generation

| Artifact | SHA-256 |
|---|---|
| `audit-artifacts/phase0-main-audit/REVIEWER_DELIVERY_INDEX.md` | `bdfdf4803dd964b23cabe3479f68e3fbf5e39f796fdb875b6489c21bdec2b5ca` |
| `audit-artifacts/phase0-main-audit/NABD_PHASE0_FINAL_CLOSURE_2026-08-24.md` | `a70f24153e932e31fa3e02605b579f09bb12dd602874c8993783d764d8d65843` |
| `audit-artifacts/phase0a-main-audit/NABD_Main_Archive_Provenance_2026-08-24.md` | `40b567b0010a3c7f613a57bc5f139d7d376ee3f1d5126d9644682204e429988f` |
| `audit-artifacts/phase0a-main-audit/NABD_Main_Source_Manifest_2026-08-24.md` | `767237c240de2894cc8b3fbe0978532ac4b05218d56cb38178a0e350c6c35e4f` |
| `audit-artifacts/phase0a-main-audit/NABD_Main_Archive_Member_Inventory_2026-08-24.tsv` | `3783db13da0d1048f52cca0ec1276aafd1ea5669710594e75b3cd7d59aa49bb4` |
| `audit-artifacts/phase0a-main-audit/NABD_Main_Archive_Exclusions_2026-08-24.tsv` | `4b57a8a4b8db4d2ac53f14e7ccc5d6199b37c6851ebcd1834cdc39158051bfb8` |
| `audit-artifacts/phase0a-main-audit/PHASE0A_COMMANDS_AND_RESULTS_2026-08-24.md` | `53ea5d0d176cd555427f4c19f77a5907ee69c8115d133402b41816f2f06c5715` |

These hashes describe the current inputs at pointer generation. Because the pointer and index themselves are delivery artifacts, recompute all hashes immediately before final delivery; the table is not a substitute for final verification.

## `.gitignore` decision

The existing `.gitignore` addition `audit-work/` is retained. It prevents local extracted working copies and temporary source workspaces from appearing as product changes or accidental deliverables. It does not suppress the committed Phase 0A archive bytes, provenance, inventory, exclusions, or audit reports. The addition changes repository hygiene only and does not change product behavior.

## Required delivery-time verification

Run the following commands immediately before reporting delivery:

```sh
git diff --check origin/main..HEAD
git diff --check
git status --short
git rev-parse HEAD
git ls-remote origin refs/heads/agent/audit-main-contract-inventory
```

The **actual branch head** is the `git ls-remote` value returned at that moment. It must be compared with `git rev-parse HEAD`; do not copy a previous commit hash into the index as if it were current. The final report must state both values and whether they match.

Then recompute content hashes:

```sh
sha256sum audit-artifacts/phase0-main-audit/REVIEWER_DELIVERY_INDEX.md \
  audit-artifacts/phase0-main-audit/NABD_PHASE0_FINAL_CLOSURE_2026-08-24.md \
  audit-artifacts/phase0a-main-audit/NABD_Main_Archive_Provenance_2026-08-24.md \
  audit-artifacts/phase0a-main-audit/NABD_Main_Source_Manifest_2026-08-24.md \
  audit-artifacts/phase0a-main-audit/NABD_Main_Archive_Member_Inventory_2026-08-24.tsv \
  audit-artifacts/phase0a-main-audit/NABD_Main_Archive_Exclusions_2026-08-24.tsv \
  audit-artifacts/phase0a-main-audit/PHASE0A_COMMANDS_AND_RESULTS_2026-08-24.md
```

## Gate disposition

Phase 0A.1 is accepted only for **delivery-integrity correction** when the diff check is clean or every remaining whitespace issue has a line-specific exception, `.gitignore` is documented, artifact hashes are recorded, the remote head matches the local head, and the working tree is clean. This gate does not close Phase 0B or authorize Phase 1. Semantic full-read status remains governed by the Phase 0A manifest and the reviewer’s acceptance decision.
