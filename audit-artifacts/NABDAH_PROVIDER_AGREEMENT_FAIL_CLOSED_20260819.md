# Nabdah Provider — Agreement Fail-Closed Remediation

**Date:** 2026-08-19  
**Scope:** Provider source archive only.  
**Result:** **PASS — provider agreement display and electronic acceptance now fail closed without a verified, versioned policy.**

## Confirmed Defect

The provider agreement modal previously contained a long local legal-agreement fallback. If policy loading failed, the app displayed that unverified text. The acceptance button remained available and attempted to accept the agreement with an empty request body; any server failure was swallowed and the modal closed. This could falsely represent legal acceptance and conflicts with the owner requirement that legal/consent contracts remain fail-closed pending authorized content and review.

## Remediation

| Control | Current behavior |
|---|---|
| Policy display | Clears stale state when reopened and displays only a policy with both server-provided `content` and `version`. No hard-coded agreement is retained. |
| Unavailable policy | Shows a clear unavailable message rather than legal text when the policy cannot be loaded. |
| Acceptance gate | The agreement button is disabled while accepting or while no approved policy is available. |
| Version binding | Acceptance includes `{ version: policy.version }`, binding the mutation to the displayed version. |
| Error handling | Acceptance errors produce an error message and preserve the modal; only a successful server response closes it. |
| Locale coverage | The three new fail-closed messages were added to the six-locale resolver, increasing its verified text-pair count from 2,810 to 2,813. |
| Regression | New contract test rejects the local agreement, empty silent catch, and acceptance without policy/version. |

## Verification Gates

| Gate | Result |
|---|---|
| TypeScript | **PASS** |
| Provider contract tests | **PASS — 1 suite / 27 tests** |
| Production-mode Expo web export | **PASS — 900 modules bundled** |
| ZIP integrity | **PASS** |

## Archive Candidate

```text
NabdProvider-provider.zip
SHA-256: 514a651b2163f9de9c2ba3255f1f2a1908795c63a630f33bf805ba4679af188d
```

## Explicit Boundary

This source remediation does not approve any legal content. The owner/legal/product team must still approve the actual policy content, language availability, acceptance record, retention, retrieval, and audit requirements. No agreement was accepted and no production action occurred in this batch.
