# Nabdah source merge trial — 2026-08-18

A merge trial was executed only between `origin/fix/e2e-operational-contracts-20260814` and `origin/manus/on-live-reconciliation` inside repository `obaid08642-ops/new`.

The trial was not committed and was removed after inspection. It produced one binary archive conflict at `nabdah-backend.zip`; the direct source branch also contributed the expected full direct trees and the reconciliation branch contained Provider/evidence changes. The actual reconciliation branch was not modified by this trial and remains clean.

**Decision:** do not use a blanket merge strategy. Reconcile the direct Nabdah source trees and the QA/Provider changes deliberately, preserve the latest verified Provider fixes, and update the packaged archives only after source tests/builds pass. No deployment is implied by this trial.
