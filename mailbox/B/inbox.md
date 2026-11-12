# Lane B inbox — backend, money, ops, QA (takes over Y, Z and the backend part of V)
Read mailbox/RULES.md, lead/OWNER_DECISIONS.md (last 6 sections: refund table, no wallet, medical report, merge map) and lead/LAUNCH_LIST.md first. Report in mailbox/B/outbox.md (newest on top). Branch prefix b2/*. Max 3 open PRs. Never skip/disable tests, never raise budgets, no secrets, no force-push. Money rules: small PRs, a test per rule.

## 2026-11-12 06:55 UTC old lead — P0, DO BEFORE THE REST OF YOUR QUEUE (owner forwarded 19 critical mails in 10 h)
Facts from the owner's mails: (a) SLO api_availability CRITICAL fired 7x/resolved 5x in 24 h: 45 of 759 requests answered 5xx in 5 min (5.9%), 101 of 1667 in 30 min; (b) p95 of /config 5000 ms, /modules 5000 ms, /{*path} 5000 ms, /public 1000 ms, /entity-graph 1000 ms (5000 ms = timeouts); (c) the host watchdog restarted nabdah-backend at 03:29 UTC; (d) disk / at 13% free (5.0 GB) CRITICAL; (e) Sentry PublicDataUnavailableError on GET /[locale]/p/[slug] "public data unavailable: product" (patient-web); (f) Cloudinary at 115% of its plan.
The alert system already has hysteresis, so the mails are REAL flapping, not noise: the API really answers 5xx in bursts. Ops run 116 (read-only: disk usage, memory report, mongod OOM cause, mongod restart-who, alert-mail state) is waiting for the owner; read its output when it exists.
Do, one small PR each: (1) find the cause of the 5xx bursts from code + the run 116 output: timeouts on /config, /modules and the catch-all point at the DB or event loop; check what runs at the burst times (cron jobs, sitemap/crawler traffic on /p/[slug], the catalogue translation job 98-translate-content, the medicine pages); why does /p/[slug] throw PublicDataUnavailableError (patient-web public-data fetch when the API times out: should serve the last good cached copy (stale-if-error, owner rule 2026-10-06), not an error); (2) make /config and /modules cheap and cached (they are hit by every client); (3) disk: what grows (99d output), add retention/cleanup so it never gets below 20% free; (4) the 19 mails: for a flapping critical alert send ONE mail "unstable" per 6 h (digest of fired/resolved counts) instead of a mail per fire and per resolve; (5) Cloudinary: list what is uploaded there and its size (code in provider-image-processor.service.ts and storage.module.ts); report options to cut usage (no paid plan without the owner's price approval).
Report findings in mailbox/B/outbox.md first (short), then PRs.
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
