# Nabd — Phase 5 root-register provenance and structural validation

**Evidence-delivery branch:** `agent/phase4-final-evidence-register`
**Verified remote head:** `a3f5f388aeef9e476cbbb07695ff227c45739e25`
**Audit baseline declared by delivered files:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`
**Audit date:** 2026-08-27
**Mode:** artifacts-only; no product-source change, execution, runtime test, migration, merge or deployment.

> **Acceptance boundary.** This validation establishes that the five delivered files are reachable at the declared immutable Git commit, that their downloaded bytes match Git blobs, and that the mapping has the stated basic structural counts. It does **not** independently prove every finding’s semantics, source-line validity, runtime behavior, external integration, production readiness, or historical workstation-commit claim.

## 1. Remote provenance verification

The branch head was resolved via the remote Git reference and was exactly equal to the user-provided commit. Each file was fetched from the declared commit—not from a mutable branch tip—and independently hashed as a Git blob. Every local hash equaled the corresponding remote blob identifier.

| Delivered file | Remote Git blob | Local `git hash-object` | Blob result | Local SHA-256 |
|---|---|---|---|---|
| `NABD_Final_Manual_Root_Defect_Register_2026-08-27.md` | `8b4a674a31deaaf0d458bc6468550d5483bca672` | `8b4a674a31deaaf0d458bc6468550d5483bca672` | `PASS` | `e04d6bbc196017168e17227d49c16822ecbfc2ff053ee45392fed1f6a2a6bbb8` |
| `PHASE4_MAPPING_COMPLETENESS_AUDIT_2026-08-27.md` | `a62c4d081adb7ff1684b69825c1f3f77b709a5e8` | `a62c4d081adb7ff1684b69825c1f3f77b709a5e8` | `PASS` | `eac29dea7faedcd858a8510b25ea0e72906ccf0b94ae8f380c35c3d113b2427a` |
| `NABD_Final_Root_Mapping_WORKING_2026-08-25.tsv` | `818913ad7d2ad0c0906f50e6eb20a8d59ba6b1c5` | `818913ad7d2ad0c0906f50e6eb20a8d59ba6b1c5` | `PASS` | `02d610e75e44a43cbb1391842096dbfd35e47517f74434b314548ba6be4beb35` |
| `PHASE4_CROSS_ROOT_DERIVED_REVIEW_2026-08-27.md` | `1b5e730a6335c7bffd110e58ab5338b1da3e30f1` | `1b5e730a6335c7bffd110e58ab5338b1da3e30f1` | `PASS` | `5f7be16b0881af5f2b558a9b464deb71787fcf552603c1f2044cd9c2177814db` |
| `PHASE4_ARTIFACT_DELTA_ISOLATION_2026-08-26.md` | `5e684f1814a7d4c70e6f54d86e851c0aef1b6632` | `5e684f1814a7d4c70e6f54d86e851c0aef1b6632` | `PASS` | `15e249ca49965fa0a1225a201b002242a906824d7a6068d9dddeb689eed19590` |

## 2. Structural mapping validation

The delivered `PHASE4_MAPPING_COMPLETENESS_AUDIT` reports deterministic reconciliation of a frozen ledger and mapping, rather than semantic or runtime verification. A separate local parse of the delivered TSV reproduces the core cardinalities below.

| Control | Delivered report | Independently parsed delivered TSV | Result |
|---|---:|---:|---|
| Mapping rows | 852 | 852 | `PASS` |
| Distinct candidate labels | 852 | 852 | `PASS` |
| Distinct raw finding IDs | 852 | 852 | `PASS` |
| Final mapped rows | 852 | 852 rows with `FINAL_MAPPED` | `PASS` |
| Distinct final root IDs | 125 | 125 | `PASS` |
| Root headings in root register | 125 asserted | 125 literal `R-*` headings | `PASS` |
| Required TSV columns | 10 asserted | 10 found | `PASS` |

The mapping report also declares zero unreviewed mappings and zero blocking reconciliation issues, plus 178 non-owning derived-graph fan-out advisories. These claims are structurally consistent with the supplied reports and TSV; the derived-graph document remains an advisory cross-reference and not a remediation instruction.

## 3. Scope treatment after verification

| Item | Phase 5 treatment | Not established by this validation |
|---|---|---|
| Final root register | `ACCEPTED_AS_FROZEN_SCOPE_REFERENCE` for creating root-linked repair-card drafts after direct source revalidation. | A root is not fixed, runtime-verified, product-approved, or authorized for implementation. |
| Root mapping TSV | `ACCEPTED_AS_STRUCTURALLY_VERIFIED_MAPPING_INPUT`. | Its individual exact evidence requires source-byte/line revalidation before a repair card can cite it as current baseline proof. |
| Cross-root derived review | `ADVISORY_ONLY`. It can flag impacts but does not combine root ownership or expand a PR scope. | A derived relation does not create another defect or acceptance criterion automatically. |
| Artifact-isolation record | `BINDING_CONTROL`. Subsequent audit artifact deltas—including incoming snapshot reports—remain unaccepted overlays until independently reconciled. | No artifact branch can silently change frozen taxonomy, roots or business rules. |
| Incoming workstation snapshot | `SEPARATE_DELTA_REVIEW`. Current static findings remain candidates to map against root IDs. | The snapshot’s one-commit history and missing Provider/Admin source are not cured by delivery of the root register. |

## 4. W0 status update

The prior missing-root-register blocker is resolved at the **input** level: the five named documents now exist at a verified immutable remote commit. W0 cannot close because required implementation inputs remain unavailable or unapproved.

| W0 condition | Updated status | Reason |
|---|---|---|
| Frozen root/mapping inputs | `INPUT_VERIFIED_STRUCTURALLY` | Verified remote commit, blobs and counts. |
| Root-specific repair cards | `READY_FOR_DRAFTING_AFTER_DIRECT_EVIDENCE_RECHECK` | Must revalidate cited baseline source lines and map current snapshot observations without keyword inference. |
| Provider/Admin source scope | `BLOCKED_INPUT` | No complete Provider application or Admin frontend supplied with incoming snapshot. |
| Original workstation history | `BLOCKED_INPUT` | One-commit sanitized snapshot does not expose claimed commit objects. |
| Runtime/third-party evidence | `NOT_AUTHORIZED / RUNTIME_REQUIRED` | No approved isolated environment, fixtures, contracts or owners yet. |
| Product source changes | `NOT_AUTHORIZED` | Root register explicitly denies remediation authorization. |

## 5. Next controlled action

Proceed only with a **read-only source revalidation and repair-card draft** for a small risk-homogeneous set of roots. The first set is limited to financial/insurance/booking/pharmacy roots with exact baseline anchors already identified, then cross-checked against incoming snapshot delta evidence. No root receives `CLOSED_WITH_EVIDENCE` and no source file changes until the responsible owners approve a bounded card, contract/state-machine design and test environment.

**Local download record:** `/tmp/nabd-phase5-authoritative-inputs/SHA256SUMS.txt`.
