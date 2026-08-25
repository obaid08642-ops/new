# Phase 0D semantic evidence

- **Surface:** Patient Web
- **Archive:** `nabd-patient-web.zip`
- **Member path:** `lib/api/reminders.test.ts`
- **Member SHA-256:** `e26c57c2331efdaf227ac748faaf40f8fe1d956b068ead829fa4faa3681e4087`
- **Line count:** 11
- **Read range:** `1-11`
- **Classification:** `OWNED_TEST`

## Static semantic observations

This evidence is derived from the complete decoded member bytes in the baseline archive. It is not runtime proof and no product code was executed or changed.

### routes_screens_actions
- No matching static signal found in this member.
### backend_consumers_or_contracts
- No matching static signal found in this member.
### auth_ownership
- No matching static signal found in this member.
### state_transitions
- `8: const reminders = extractMedicationReminderSummaries({ reminders: [{ id: reminderId, medicine_name_ar: "Medicine", dose: "1 tablet", times: ["08:00", "invalid"], frequency: "daily", today_doses: [{ time_key: "08:00", status: "taken" }, { ti`
- `9: expect(reminders).toEqual([{ id: reminderId, medicineName: "Medicine", dose: "1 tablet", times: ["08:00"], frequency: "daily", todayDoses: [{ timeKey: "08:00", status: "taken" }] }]);`
### payment_insurance_relevance
- No matching static signal found in this member.
### error_empty_loading_retry_cancel
- `8: const reminders = extractMedicationReminderSummaries({ reminders: [{ id: reminderId, medicine_name_ar: "Medicine", dose: "1 tablet", times: ["08:00", "invalid"], frequency: "daily", today_doses: [{ time_key: "08:00", status: "taken" }, { ti`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
