# Provider RealScreensExtended: manual semantic review

## Scope

تمت قراءة `src/screens/shared/RealScreensExtended.tsx` كاملًا، lines 1–508، baseline `main @ 22526bedb77a3d8148219036367e4714f401aecc`. اسم الملف ليس دليلاً على أن الأسطح حقيقية؛ يحتوي مزيجًا من read shells وplaceholder UI وبيانات ثابتة.

## Confirmed defects and missing closures

| ID | Evidence | Finding | Required closure |
|---|---|---|---|
| P-RX-001 | 9–29 | Pharmacy QR screen renders only an icon; printable PDF CTA emits a downloading toast and no QR/PDF/catalog URL is created | branch-scoped signed/expiring catalog QR and real printable artifact/download under authorization |
| P-RX-002 | 31–87 | Chronic disease program re-labels refill-order medicine items as patient disease/program data; it has no consent, enrollment, clinician/prescription/refill policy or actions | distinct consented chronic-care/refill program with prescription validity, patient/provider relationship, notifications and audit |
| P-RX-003 | 90–154 | delivery fallback chooses first out-for-delivery allocation when no order is passed; map is a static icon/card while page claims live GPS and exposes courier phone | order-bound authorized tracking only, real constrained location feed/ETA, courier consent/privacy and error/offline lifecycle |
| P-RX-004 | 156–193 | refill list is read-only and does not show prescription verification, substitution, stock, patient authorization, offers, payment/insurance or state action | reconcile with pharmacy broadcast → offer → patient-selection journey and prescription/refill safety contract |
| P-RX-005 | 195–213 | `DrugPriceComparisonScreen` contains hard-coded Panadol/12 SAR/13.5 SAR values | remove as mock or build an authoritative compliant price-comparison source; do not display static market claims |
| P-RX-006 | 215–256 | Add Product submits free name/price/barcode to a generic approval request, without SFDA match, product form/strength, manufacturer, Rx/controlled status, lot/expiry/stock or scope proof | regulated catalog request that validates authoritative medicine identity and carries no provider-controlled patient price/availability claim |
| P-RX-007 | 258–329 | expiry reads a plausible API but permits no quarantine, stock adjustment, recall, batch trace or acknowledgement; text asserts all stock is safe from an empty response | inventory/lot state machine with expiry alerts, quarantine/recall actions, audit and truthful empty/error semantics |
| P-RX-008 | 331–371 | shortage report accepts free drug details and sends generic high-priority support ticket; no SKU, lot/location, quantity, stock signal or escalation lifecycle | structured shortage/recall workflow with catalog identifiers, branch inventory, triage and regulatory/audit policy |
| P-RX-009 | 373–439 | Lab catalog is read-only but empty copy directs provider to add packages from an unavailable screen; it does not distinguish test capability/price/turnaround approval | catalog management route under lab competency/equipment/quality-price governance, or change the copy to an actionable valid path |
| P-RX-010 | 441–506 | Lab home-service view is read-only and provides no linked management state; zone/base fees require backend authority, equipment/collector capacity and patient pricing consistency | reconcile zones with provider dispatch/capacity and approved service/fee policy; add secure management or remove implied ability |

## Cross-journey conclusion

This file contains both useful read shells and explicit placeholders. It cannot be treated as production-ready or used to claim QR delivery tracking, chronic-disease management, price intelligence, regulated product creation, expiry governance, or home-collection configuration. Each surface needs its own authenticated data/authorization/disposition contract.
