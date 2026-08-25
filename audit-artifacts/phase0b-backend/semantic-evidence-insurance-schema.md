# Phase 0B semantic evidence — Insurance schemas

**Baseline:** `main @ 22526bedb77a3d8148219036367e4714f401aecc`

**Member read in full:** `src/schemas/insurance.schema.ts:1–113`

The file defines five related schema surfaces. `InsuranceNetworkContract` stores company/network IDs and names, covered classes and copay percent/flat values (`5–18`). `InsuranceCompany` stores unique code, bilingual names, logo/source/hash/verification metadata, regulatory source, entity type/status enums, provenance/version, supersession/retirement and active flag (`20–44`). `InsuranceNetwork` stores company ID, code/names, tier, source/provenance/verification and catalog status/retirement (`46–64`). `CoverageRule` stores network ID, free-form service type/key, copay percent/flat limit, preauthorization and annual limit (`66–79`). `InsuranceClaim` stores patient ID, service, amount, covered amount, status enum and string date (`81–93`). Embedded `InsuranceDetails` stores policy/member/reference identifiers, approval status/date/actor, amounts/percentages and rejection reason (`95–112`).

Positive controls include unique company code, catalog/status enums, pending defaults, source/provenance/verification fields, catalog version and historical supersession/retirement fields (`23–41,49–61`). However, ID fields are plain strings and no database-level foreign-key or compound uniqueness constraints are visible between companies, networks, contracts, coverage rules, patients and claims (`8,11,23–24,49–50,69–72,84–86`). Names and codes have no normalization/length/localization rules, and source URLs/hashes are not constrained to approved origins or immutable evidence beyond comments (`24–39,50–61`).

Financial and clinical truth is not schema-enforced: copay/coverage amounts and percentages have no ranges, currency, scale, effective dates, formula invariants, annual-period semantics or settlement linkage (`15–16,73–76,87–90,104–109`). Claims have no service/order/appointment/provider/reference/attachment, currency, immutable decision, reimbursement transaction, timezone or audit linkage; `date` is a free-form string (`83–90`). `InsuranceDetails` has no ownership/tenant scope, policy verification source, document retention, actor authorization, consistency invariant between shares/coverage/copay, or redaction/projection policy (`97–110`).

No code was changed and no build/test/application operation was performed during this read.
