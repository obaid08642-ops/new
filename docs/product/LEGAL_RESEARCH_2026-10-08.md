# Saudi legal and regulatory research (reviewer, 2026-10-08)

Desk research, not legal advice.

**Purpose**
- Decide what the platform can settle itself, built into the product.
- Isolate what only a licensed party or a government portal can settle.

The sources are listed per topic. Several are third-party summaries; official portals win where they differ.

## 1. Health data and hosting (PDPL)

**Facts**
- SDAIA enforces the PDPL and the *Regulation on Personal Data Transfer Outside the Kingdom* (2024).
- Transfers abroad must be strictly necessary, need a risk assessment, and need one recognised safeguard: SDAIA standard contractual clauses, binding common rules, or a certificate.
- The telehealth guidelines (NHIC) also say that emergency telemedicine should run on a platform **hosted in Saudi Arabia**, with two-factor access, and that it must follow PDPL, NDMO and NCA requirements.

**Product decisions (no lawyer needed)**
- Development stays on OVH Germany only while there are no real users.
- **Production with real patients runs on an in-Kingdom host.** This is decision 21, and the migration happens before launch.
- Two-factor sign-in for providers and admin is already in the product (step-up, admin devices).

**Sources**
- [Securiti: transfer regulation](https://securiti.ai/regulation-on-personal-data-transfer-outside-the-kingdom/)
- [King & Spalding](https://www.kslaw.com/news-and-insights/international-personal-data-transfers-under-saudi-arabias-data-protection-law)
- [HFW: SCCs vs BCRs](https://www.hfw.com/insights/cross-border-data-transfers-in-ksa-standard-contractual-clauses-vs-binding-common-rules/)
- [NHIC Telehealth Application Guidelines](https://nhic.gov.sa/standards/Telehealth/Telehealth-Application-Guidelines.pdf)

## 2. Telehealth (online consultations)

**Facts**
- Licensing sits at the **facility** level: a "Telemedicine Centre" (a Support Health Services Centre) licensed by MOH through the Business.sa service. It needs a commercial registration and at least one specialist physician.
- Each doctor practises under their own **SCFHS licence**; there is no separate telemedicine licence for a doctor.
- In-person rules apply equally online.

**Two lawful models**
- **Model A:** the company gets its own telemedicine centre licence.
- **Model B:** the platform is a marketplace and booking tool, and every consultation is provided by an already-licensed facility or clinic. That facility is the provider of record.

**Product decisions**
- Every doctor shows an SCFHS licence number verified by admin (decision 17).
- Every consultation records the licensed facility of record (needed for model B).
- Clinical notes are kept per MOH rules.

**Only the owner can do this:** pick model A or B, then apply on Business.sa or sign facility partnership contracts.

**Sources**
- [Business.sa: Telehealth and Telemedicine Center License](https://business.sa/en/servicesprocedures/details/a9b1f436-1071-4bed-0900-08dbf015747a)
- [Al Tamimi](https://www.tamimi.com/law-update-articles/the-regulation-and-licensing-of-telemedicine-in-saudi-arabia/)
- [NHIC governing rules](https://nhic.gov.sa/standards/Telehealth/the-governing-rules-of-telehealth-english-executive-rules.pdf)

## 3. Pharmacy orders

**Facts**
- Pharmacies (and distributors and wholesalers) hold SFDA and MOH establishment licences.
- I found **no published "e-pharmacy marketplace" licence category**.
- Our model is safer: the platform broadcasts the patient's request, a **licensed pharmacy** makes the offer, dispenses and delivers. The pharmacy is the seller of record.

**Product decisions already taken**
- Only licensed pharmacies, with KYC.
- No promotion of Rx items (decision 10).
- A prescription is required for Rx items; controlled items are never orderable.
- A price ceiling (decision 12).

**Only the owner can do this:** confirm with SFDA, through its e-services or by enquiry, that a marketplace which never stores or sells medicine itself needs no establishment licence of its own.

**Sources**
- [SFDA implementing regulations of the pharmaceutical law](https://www.sfda.gov.sa/sites/default/files/2025-05/SFDA28122020ee1.pdf)
- [InCorp: SFDA licences](https://incorp-ksa.com/blog/a-practical-guide-for-sfda-licenses-and-permits-in-saudi-arabia/)

## 4. E-invoicing (ZATCA)

**Facts**
- Phase 2 requires UBL 2.1 XML (or PDF/A-3 with XML), a cryptographic stamp, a UUID and a QR code per invoice.
- It applies in waves by revenue. The latest reported wave (25) covers VAT revenue above SAR 187,500, with integration due by 1 Feb 2027.
- Penalties are reported at SAR 5,000–50,000 per violation.

**Product decision**
- Build Phase 2 invoicing (Fatoora integration) into payments before launch.
- The `ZATCA_ENABLED` flag exists, but the integration is not verified.

**Owner:** VAT registration, and the wave date in the Fatoora portal.

**Sources**
- [AmalERP: all 25 waves](https://amalerp.com/sa/zatca-e-invoicing-phase-2)
- [RTC Suite](https://rtcsuite.com/e-invoicing-saudi-arabia/)
- [Flick: Wave 24](https://www.flick.network/en-sa/zatca-wave-24-phase-2-einvoicing-2026-guide)

## 5. Consumer cancellations and refunds

The 7-day cancellation right exists, and agreed cancellation costs are allowed. This is already applied in decision 26.

## What still needs a licensed person

These are signatures and filings, not research:
1. **Telehealth model A or B**, and the licence or partnership contracts.
2. **SFDA confirmation** of the pharmacy marketplace model.
3. **Terms, privacy notice and consent text,** reviewed once before launch. We draft them; a Saudi lawyer signs off.
4. **The commercial registration activities** that match the chosen model.
