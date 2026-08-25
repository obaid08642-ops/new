# Phase 0B semantic evidence — Media controller authorization spec

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/modules/media/media.controller.spec.ts:1–22`

The spec imports reflection metadata and checks the roles metadata resolved from `MediaController.prototype.deleteFile` and `MediaController` (`1–14`). It asserts the method is role-restricted to `ADMIN` and `SUPER_ADMIN`, and explicitly excludes `PATIENT` and `DOCTOR` (`15–21`). The test is labelled as a regression guard for deleting arbitrary R2 objects by key.

This is a metadata-only assertion. It does not execute the HTTP route or guard, prove authentication/unauthenticated behavior, validate key/path normalization or traversal, verify tenant/object ownership, check that admin scope is platform-wide and authorized, test delete idempotency/audit/retention/legal hold, inspect signed URL access, content-type/size scanning, or prove actual R2 deletion behavior. It also does not test other media endpoints or upload flows. No code was changed and no build/test/application operation was performed during this read.
