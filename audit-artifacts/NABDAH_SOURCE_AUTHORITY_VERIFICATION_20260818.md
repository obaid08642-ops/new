# Nabdah source authority verification — 2026-08-18

The work is restricted to the selected repository:

> `https://github.com/obaid08642-ops/new.git`

The direct implementation source is `/home/ubuntu/nabdah-authoritative-worktree`, currently at commit `21006ccc9422ca1e95c62c45867b2a704841fc09`, which matches the remote tip of `fix/e2e-operational-contracts-20260814`.

The QA/evidence repository is `/home/ubuntu/nabdah-live-work`, on `manus/on-live-reconciliation`, currently at commit `d3eb2665016a860791ac71219f4bf24978d03372`, which matches the remote branch tip. This branch contains audit artifacts and `todo.md`; it is not being treated as the implementation source. Source changes must be made against the direct source branch and then documented/pushed through the agreed reconciliation flow.

No `Alhrajplus`, `Naps-admin`, or unrelated repository was used for the Nabdah audit.

The interrupted dependency installation created only an untracked partial `backend/node_modules` directory in the authoritative worktree; it was removed without changing source files or database data. The clean source worktree is now restored for the next build attempt.

Current plan alignment remains: source identity first, then contract reconciliation, then build/test gates, then sandbox-only production E2E, followed by fixes/revalidation and a final readiness decision. The current evidence does not justify a production-ready declaration yet.
