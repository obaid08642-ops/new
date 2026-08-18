# Full production closure baseline — 2026-08-18

## GitHub baseline

The selected GitHub repository is `obaid08642-ops/new`. The active reconciliation branch is `manus/on-live-reconciliation`, currently at commit `fcfa02b9565f8c4b03952598fb26639d32589764`. The remote currently exposes this reconciliation branch; the repository default branch is `main`.

The local `/home/ubuntu/nabdah-live-work` tree is the QA/evidence worktree. The expanded full-closure program has been appended to `todo.md` and is currently uncommitted pending this baseline commit.

## Source-authority status

The Provider source has verified snapshots and an authoritative `App.tsx` restoration path. The Patient and Backend snapshots exist in separate local trees and require commit/hash reconciliation before any new source patch. The full Admin tree is outside the reconciliation worktree and has not yet been proven to be the authoritative Git source. No Admin source patch is allowed until that mapping is established.

## Governance decision

All subsequent changes must be made only in an authoritative source tree, tested, documented, and pushed to `manus/on-live-reconciliation`. Production deployment is a separate operation and is not implied by a Git push. No lifecycle mutation may use fabricated IDs, unlinked providers, or non-sandbox data.
