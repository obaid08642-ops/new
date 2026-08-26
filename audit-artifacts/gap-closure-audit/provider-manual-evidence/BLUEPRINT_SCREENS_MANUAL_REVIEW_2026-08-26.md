# Provider BlueprintScreens: manual semantic review

## scope

تمت قراءة `src/screens/shared/BlueprintScreens.tsx` كاملًا، 1–1409، من baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. تسمية الملف `Blueprint` ليست الحكم؛ الأحكام الآتية مبنية على التنفيذ الفعلي للـCTA والحالة.

## confirmed fake, non-persistent, or skeleton workflows

| ID | exact evidence | confirmed defect | required disposition |
|---|---|---|---|
| P-BP-001 | 176–212 | `ProfileWebConfig` يبدأ bio/social/url ثابتة، و`handleSave` عند 180–182 يعرض success ويرجع بلا request أو persistence؛ وURL ثابت `p-1` في 204 | remove until an authorized provider-profile/public-page contract exists, or build it with server-generated slug, save/read, moderation, SEO/privacy controls |
| P-BP-002 | 386–445 | `ReputationHub` يعرض Gold tier وtop 5% ومؤشرات 98%/94%/88% بقيم ثابتة بلا request | remove/feature flag؛ ثم rebuild from a governed analytics source with date/denominator/permissions |
| P-BP-003 | 936–1073 | referral screen يحتوي `patient_1`، `hasInternalLab=true`، three hardcoded labs، four hardcoded tests؛ `routeInternally` عند 999–1003 success بلا request | replace with patient selection scoped to provider relationship, catalog/network/routing sourced from server, authorization/audit/consent and real internal referral transition |
| P-BP-004 | 1221–1225 | `confirmArrival` يوقف local watch ويعرض `Arrival logged` ثم يرجع دون API request | false successful emergency state transition; add server-authorized arrival transition, timestamp/location/proof, retry/idempotency/audit, or prevent completion CTA |
| P-BP-005 | 1281–1298 | `NurseVisitConsole` و`NurseChecklistConsole` skeleton only; no visit context, read/mutation, checklist or result | missing capability; do not expose as completed nursing workflow |
| P-BP-006 | 1300–1316 | `PharmacyBroadcastResponse` و`InventoryExpiryMonitor` are header-only screens with no business behavior | missing capability; remove routes or implement real pharmacy quote/expiry contracts |

## high-risk partial workflows requiring contract review

| ID | evidence | risk / required proof |
|---|---|---|
| P-BP-007 | 449–546, coupled to PharmacyDashboard 128–132 | modal can auto-decline locally and callbacks do not include a request/event identity; must prove server-side SLA/accept/reject transition, unique order binding, notification, event idempotency and accessible timeout handling |
| P-BP-008 | 555–690 | CRM exposes/edits patient tags, blocks and private notes through `/provider/features/crm`; requires strict patient-provider relationship, purpose limitation, audit history, note immutability/versioning and granular role controls; no proof in frontend alone |
| P-BP-009 | 780–927 | clinical SOAP/AI workflows handle sensitive notes and send to `/ai/copilot/suggest` and `/home-care/notes`; requires patient authorization, role/scope, human-review provenance, no unsanctioned PHI transfer, model safeguards, audit and retention; endpoint presence is not completion evidence |
| P-BP-010 | 1086–1219 | SOS claim/GPS tracking client paths exist but need geo precision/consent/retention, role eligibility, assignment race protection, dispatch state machine, emergency escalation and negative path proof |
| P-BP-011 | 1318–1401 | lab scanner lists all samples then patches stage; no proof of sample custody, technician/lab scope, device/camera scan, result entry route, double-scan/replay, accession audit or patient notification |
| P-BP-012 | 114–167 and 219–297 | promotions/ad purchase UI submits price/budget fields from client but no payment intent/ledger/webhook/approval lifecycle is statically proven; cannot claim paid ads are operational |

## static anchors that may be reusable but are not completion evidence

Some modules call client endpoints and present empty/error states. They remain potential integration anchors only. They must be reconciled to exact backend controllers, schema/state, ownership/role and test evidence before being classified as working.

## product-scope consequence

Provider cannot be treated as a primarily finished app with minor gaps. The reviewed source contains a mix of live-looking UI, static demos, skeleton routes and sensitive clinical/financial workflow surfaces. The correct plan is to retire or flag incomplete capability while implementing service-specific vertical slices under a shared Backend/Data owner.
