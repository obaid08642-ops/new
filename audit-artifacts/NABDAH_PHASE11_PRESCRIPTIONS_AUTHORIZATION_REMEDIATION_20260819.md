# Phase 11 — prescription detail authorization remediation

## Finding

The current Backend archive contained a structural authorization gap in `GET /prescriptions/:id`: the controller supplied only the opaque prescription identifier and the service performed a bare identifier lookup. The live cross-account proof could not be exercised because the Patient1 sandbox account had no prescription record; nevertheless, the archive-level path is sufficient to require remediation rather than treating the empty live dataset as a pass.

## Remediation

The endpoint now passes the authenticated user to `getByIdForUser`. The service permits the record only when the caller is the stored patient, stored doctor, stored pharmacy, or has an effective `admin`/`super_admin` role. Every other caller receives `404`, deliberately making a foreign record indistinguishable from a missing one. Role evaluation uses the existing `getEffectiveRoles()` normalization so provider-type aliases remain compatible with the already deployed provider-role guard model.

| Control | Status |
|---|---|
| Patient owner may read | **PASS — regression covered** |
| Associated doctor may read | **PASS — regression covered** |
| Associated pharmacy may read | **PASS — regression covered** |
| Administrator may read | **PASS — regression covered** |
| Foreign patient is existence-hidden | **PASS — regression covered with `NotFoundException`** |
| Unrelated provider is existence-hidden | **PASS — regression covered with `NotFoundException`** |

## Verification

The focused authorization suite passed **6/6**. The complete Backend gate passed **65 suites / 370 tests**, followed by a successful `nest build`. The rebuilt `nabdah-backend.zip` passed ZIP integrity validation, contains the new regression test, excludes `node_modules`, `dist`, and `coverage`, and has SHA-256:

```text
2b47f9e7f5c289d3d35d9b211fe0de07f931aa39c08c0006c90cc4e08bdcfac3
```

## Deployment boundary

This evidence establishes the source/archive remedy only. It is **not deployed** and is not a production acceptance result. A reviewer/owner-controlled deployment, rollback point, and an authenticated cross-account sandbox proof using an actual Patient1 prescription remain mandatory before this item can be closed operationally.
