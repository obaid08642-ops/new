# Phase 0B semantic evidence — Job board schema

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/job-board.schema.ts:1–61`

The file defines CandidateExperience, CandidateProfile, JobPosting and JobApplication (`5–61`). CandidateExperience requires free-form company/role/duration and optional description (`5–12`). CandidateProfile has generated unique id, unique indexed user_id, required cv_url, nested experiences, indexed SCFHS license number, free-form required license status, required expiry, skills and is_deleted (`14–28`). JobPosting has generated unique id, required title/description/role/location/facility_id, requirements, free-form salary_range, enum draft/published/closed status and is_deleted (`30–46`). JobApplication has generated unique id, indexed job_id/candidate_id, enum submitted/under_review/interviewing/accepted/rejected status, applied_at, cover_letter and is_deleted (`48–61`).

Candidate experience/profile data has no CV file type/storage ACL/signed URL/expiry/malware/retention controls, no duration structure, dates, employer verification, skills allowlist or license authority/status validation (`7–25`). SCFHS status is a string despite illustrative values, and expiry has no future/renewal/eligibility invariant (`21–23`). user_id is plain string; no active user, unique candidate/tenant scope or candidate consent/access policy is represented (`17–20`).

Job postings have no facility owner/tenant authorization, role taxonomy/license requirements, location normalization, content moderation, publication approval, expiry or salary numeric/currency/range source. `salary_range` is a free-form string and could be stale or misleading (`33–43`). Status has no transition actor/reason, draft/published/closed invariants, edit/version/CAS or closure timestamp (`41–43`).

Applications allow `candidate_id` to refer to either CandidateProfile.id or User.id by comment, with no canonical identity, job existence/open-status, candidate ownership, duplicate application uniqueness or facility/tenant boundary (`51–55`). Application status lacks transition authorization, interview/schedule/outcome data, rejection reason, offer terms, withdrawal/consent or immutable audit (`54–58`). `applied_at` uses application current time with no timezone/source (`56`).

Candidate CV, cover letters, license numbers and job/application content are sensitive personal/professional data; no projection, access audit, encryption, retention/deletion/DSAR/legal-hold or redaction controls are represented (`17–25,34–58`). No notifications, recruiter delivery/retry, idempotency, transaction/rollback, concurrent status/CAS or search-index consistency state exists. No live license verification, upload, posting publication, application workflow or index runtime evidence is established during this source read. No code was changed and no build/test/application operation was performed during this read.
