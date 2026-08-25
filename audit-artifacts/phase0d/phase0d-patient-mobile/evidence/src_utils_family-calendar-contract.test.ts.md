# Phase 0D semantic evidence

- **Surface:** Patient Mobile
- **Archive:** `nabd_plus_patient_app.zip`
- **Member path:** `src/utils/family-calendar-contract.test.ts`
- **Member SHA-256:** `24b2a91dc5001a671de1ede08df47ebf6b0fcf66faadcdc3c444a95196d28622`
- **Line count:** 16
- **Read range:** `1-16`
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
- `12: it('rejects a malformed calendar response instead of presenting a false empty state', () => {`
### payment_insurance_relevance
- `1: import { buildFamilyCalendarPayload, parseFamilyCalendarEvents } from './family-calendar-contract';`
- `5: expect(buildFamilyCalendarPayload({ title: '  موعد متابعة  ', eventDate: '2026-09-01T10:00:00.000Z', memberUserId: 'member-1', type: 'appointment' })).toEqual({`
- `8: expect(() => buildFamilyCalendarPayload({ title: 'موعد', eventDate: '', memberUserId: 'member-1', type: 'appointment' })).toThrow('event_date');`
- `9: expect(() => buildFamilyCalendarPayload({ title: 'موعد', eventDate: '2026-09-01', memberUserId: null, type: 'appointment' })).toThrow('member_user_id');`
### error_empty_loading_retry_cancel
- `12: it('rejects a malformed calendar response instead of presenting a false empty state', () => {`

## Required verification boundary

Validate the extracted routes/actions against the live backend contract, authorization matrix, state machine, payment/insurance source of truth, and UI error/loading/empty/retry/cancel behavior before treating this surface as production-ready.
