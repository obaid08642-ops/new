# Lane B inbox — backend, money, ops, QA (takes over Y, Z and the backend part of V)
Read mailbox/RULES.md, lead/OWNER_DECISIONS.md (last 6 sections: refund table, no wallet, medical report, merge map) and lead/LAUNCH_LIST.md first. Report in mailbox/B/outbox.md (newest on top). Branch prefix b2/*. Max 3 open PRs. Never skip/disable tests, never raise budgets, no secrets, no force-push. Money rules: small PRs, a test per rule.
Deploys: you prepare a branch with tools/ops/RUN + the SHA line of tools/ops/tasks/60-deploy-main.sh; you never push to review/server-inspect; the old lead does.

## 2026-11-12 — QUEUE (in this order)
1. #2613 (RAM doc) and #2615 (hospital staff controllers, merge map rows 2+3): keep them green (merge main in if needed); the lead merges.
2. Invoices review (the biggest money item): numbering, credit notes with every refund path, VAT lines, ZATCA fields, one pass over every service; fixes in small PRs.
3. Halala migration R11: the remaining `*_halalas` read paths (P2/P3 per docs R11 money-integrity); the 8 wallets.balance doubles: dry-run plan first, owner approves before any write.
4. PT-24 payment-return journey (paid, failed, cancelled).
5. Server gate: a REJECTED or pending provider cannot call other provider routes (sign-in shows only the reason; resubmit path stays).
6. DTO leftovers (test_prices/scan_prices number, nursing settings/delta shape).
7. SCENARIOS.md AD-02 (reject/changes paths) and any PV/AD/SY row not COVERED: one journey each.
8. Merge map row 4 (three ways to create staff): VERIFICATION ONLY (callers + permission differences) in your outbox; no change.
9. Verify the mongod OOM fix after run 114 (96p, 96n, 96j output) and any slow query.
10. Gitleaks fingerprints only after the owner confirms the R2 token roll.
11. Z leftover: free-reschedule item (owner decision: GO) if Z had not finished it: check main first.
Tick lead/LAUNCH_LIST.md items when merged.
