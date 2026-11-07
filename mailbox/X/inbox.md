# Lane X — web performance and the site notice (patient-web)
## 2026-11-07 order 1
1. Read AGENTS.md (design rules, tokens-only colours, six languages, never raise a budget).
2. Make the Lighthouse `resource-summary.script.size` check green on patient-web without raising `patient-web/.github/lighthouse-budget.json`: first-load JS split (see PR #2376 and #2445/#2448 for prior work; coordinate by reading them, do not push to their branches).
3. Then rebase-free merge main into a new branch for the site notice if #2424 is still blocked, and report.
One PR per item, branch prefix `x/`. Write results to `mailbox/X/outbox.md`.
