# Phase 3 Provider — ambulance and emergency workflow gaps

## Governance boundary

The approved programme rule keeps SOS, emergency-location, QR, consent and related legal/operational contracts **fail-closed** pending owner legal/product approval. Therefore, the presence of these active Provider flows is itself a release blocker rather than evidence of an enabled emergency service.

## Confirmed defects

| Priority | Finding | Evidence | Required remediation |
|---|---|---|---|
| **P0** | Provider ambulance dashboard exposes active SOS claim, tracking, handover and completion flows despite unapproved emergency contracts | UI polls emergency missions, claims a mission, publishes GPS, records handover and completes a mission. | Remove/disable all production emergency actions and clearly state unavailability until approved consent, dispatch, location, retention, credential, incident and audit contracts are implemented and accepted. |
| **P0** | Mission loader creates an actionable fake mission after an access/load failure | When mission fetch fails or ID is absent from returned pool, it sets `{ id }` then renders controls to track, hand over, or complete. | Fail closed with a retry/back state; never expose mutation controls without a fresh owned mission DTO and confirmed state. |
| **P0** | Clinical/legal handover and completion records are unstructured and language-dependent | Hospital is a free-text name; notes and vitals are unvalidated strings. Outcome is sent as display text, so Arabic/English language choice changes the stored business value. The UI claims a legal record without signature, identity, timestamps, receiving-party confirmation, immutable audit or retention contract. | Define approved coded outcome/vital schemas, selected verified facility/receiver, provider credentials, signatures/attestation, audit/retention and applicable consent; do not make legal-record claims before approval. |
| **P1** | Location tracking lacks purpose-specific consent/status/reliability controls | App requests location then posts best-effort GPS every 30 seconds, silently ignores errors, and has no retention/precision/visibility/stop assurance. | Keep tracking fail-closed until consent and privacy policy are approved; then use explicit start/stop, receipt/last-seen UI, permission/error state and server-side retention/access audit. |
| **P1** | Availability, response and mission-history UI is not truthful | Online toggle does not establish dispatch availability; history fetches wallet ledger then always assigns no missions; failed pool load looks like no SOS calls. | Use server-acknowledged emergency availability and owned mission history; distinguish network failure from empty lists and never substitute unrelated financial data. |
| **P1** | Emergency UI lacks six-language and minimum-necessary PHI review | Displayed patient identity, symptoms, severity, time and handover content are AR/EN only and not governed by a least-data rule. | Complete approved multilingual emergency content and role/minimum-PHI controls only after the emergency policy is enabled. |

## Decision

Ambulance features are **P0 BLOCKED/FAIL-CLOSED**. No deployment or E2E activation is permitted until the owner approves the separate emergency/consent/location/QR contracts and all corresponding implementation gates are completed.
