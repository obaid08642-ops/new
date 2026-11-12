# Lane P inbox — patient web+app, conflicts, provider/admin screens (takes over X, W and the UI part of V)
Read mailbox/RULES.md, lead/OWNER_DECISIONS.md (last 6 sections) and lead/LAUNCH_LIST.md first. Report in mailbox/P/outbox.md (newest on top, one block per PR). Branch prefix p2/*. Max 3 open PRs. Never skip/disable tests, never raise budgets, no secrets, no force-push, patient changes ship on web AND app, all text in the six languages, tokens-only colours.
Deploys: you never push to review/server-inspect; the old lead does.

## 2026-11-12 — QUEUE (in this order)
1. CONFLICTS FIRST, one PR at a time (check out the branch, `git merge origin/main`, regenerate docs/design/*INVENTORY*, *WIRING_REPORT*, inventory/*.json with the repo tools, never by hand; run the PR's tests; push to the SAME branch; write it in the outbox; the lead merges when green; only then the next): #2603 x/pt54-orders (rebased once already), #2604 x/pt03-dependant, #2605 x/pt30-location, #2601 x/audit-no-show (also one red check "Patient Mobile build and tests": find the cause, no skip).
2. Refund-policy hash echo: the client sends back the policy hash it showed so the server can refuse a changed table (check what Z already added on the create bodies first).
3. Android bundle margin: keep under budget; one trim pass of dead strings when the margin < 30 KB.
4. Admin merge map row 2: payouts.tsx is the one place (approve/pay/reject), finance-suite.tsx links to it, shared confirm sheet instead of window.prompt/confirm. Check there is no second provider-side payout path first. (lead/OWNER_DECISIONS.md "APPROVED PROVIDER/ADMIN MERGE MAP")
5. LOWEST PRIORITY (owner may move them after launch): web/app parity audit round 2 (list what exists on one side only; one PR each); insurance companies and classes instead of a boolean in offers (decision 30).
Tick lead/LAUNCH_LIST.md items when merged.
