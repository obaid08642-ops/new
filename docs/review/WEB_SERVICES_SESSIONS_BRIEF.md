# Web services sessions brief (owner, 2026-10-16)

Two OpenCode sessions take the patient website (`patient-web`) service by service. The owner reports many missing, wrong and illogical things across the services; the product page was only an example. Your job is to find **every** one in your area and fix it, end to end on real data.

- **OC-W1, pharmacy and account:**
  - sign-up, sign-in, OTP, forgot password;
  - **Google and Apple sign-in on the web** (the backend has `POST /auth/social-login`; the web login page shows no social button today);
  - profile and addresses;
  - catalogue `/c`, search, product page, cart, checkout (Moyasar only), orders, returns;
  - prescriptions upload and the Rx rule;
  - pharmacy insurance relay;
  - wishlist and notifications.
- **OC-W2, care services:**
  - doctors (search, profile, booking), consultations (chat, video call, follow-up, prescriptions, ratings);
  - labs and radiology (browse, compare, book, sample, results);
  - home nursing and home care;
  - insurance profile, coverage and approvals;
  - emergency (public number);
  - maternity, mental health, nutrition, family, health records, settings.

The fix session already has open PRs; **do not redo them, extend them after they merge**:
- #1566 product page;
- #1553 instant search;
- #1587 AI scanner;
- #1605 pharmacy insurance-first;
- #1604 insurance/self-pay filters;
- #1589 nursing times.

Answer the owner in Egyptian Arabic; code and docs in English.

## Method (per page of your area)
1. **Open it like a patient** on the live-gate stack (seeded, real backend, `tools/live/`):
   - signed out and signed in;
   - at 390 and 1280 px;
   - in ar and en (ur in RTL as a spot check).
2. **Click every control.** For each one:
   - does it do what its label says, on real data, and is the result correct and logical?
   - are empty, loading and error states there, and is the copy right?
   - compare with the mobile board / the patient app screen for missing parts.
3. **Write each defect in one line** in `docs/review/walkthrough/<area>.md`:
   - page, control, what happens, what should happen, `file:line`;
   - class: broken / missing / wrong / illogical / slow / copy.
4. **Fix them, one PR per flow** (for example "pharmacy checkout"), each with:
   - a Playwright journey under `patient-web/tests/e2e` or `tools/live/j_*.py` that fails on `main` and passes after (paste both);
   - real backend data, no mocks, no placeholders, no "coming soon";
   - six languages; tokens only; no new colours, logo or patterns (state "Identity check: no new colours/logo/patterns");
   - when the backend route or field is missing, build it (DTO with validators, service, schema, admin side if managed there).
5. **Rules:**
   - Prescriptions are never bypassed. The patient pays only on Nabd Plus pages (Moyasar).
   - Removed features stay removed.
   - Never skip, disable or weaken a test.
   - Never edit `*/acceptance/**`.
   - No `--no-verify`.
   - Never commit `backend/package-lock.json` drops.

## Git
- One branch per flow, `oc/w1-<flow>` or `oc/w2-<flow>`, from today's `main`. One PR into `main`.
- Bring `main` in with a merge commit. Never rebase or force-push.
- You never merge: the review session does.
- CI must be green.
