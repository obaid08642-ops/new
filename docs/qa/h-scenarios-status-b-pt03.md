# H scenarios, status B: PT-03

| ID | Scenario | Status after | Evidence | Notes |
|---|---|---|---|---|
| PT-03 | Guardian books for a dependant (minor) | PARTIAL | `patient-app/src/__tests__/family/member-book.test.tsx` (new); `patient-app/src/__tests__/consult/booking-screens.test.tsx` "issue 684" (existing) | Consultations path covered end to end in the client; minor/guardian rule not enforced anywhere (backend gap below); diagnostics and pharmacy do not carry the member |

## What exists
- `FamilyMemberView.tsx:103`: "Book on their behalf" already calls `setBookingFor(member)` (`src/utils/bookingFor.ts`) and then opens the consultations tab. The "known open" item in the brief is stale: the member IS carried.
- `BookingConfirmForm.tsx:144,202`: sends `for_member_id: bookingFor.id`, shows the member's name on the confirm screen with a "book for me instead" action, clears the subject after booking (line 149).
- Ordering context (`src/utils/orderingContext.ts:57`) sends `family_member_id` only when the id is in the profile's family list; an unknown id is dropped.

## What I tested
- New: pressing `member-book` stores exactly `{id, name}` of the member (not the signed-in patient) and pushes `/(tabs)/consultations`; nothing is stored before the press.
- Existing, relied on: confirm screen shows the member name; POST `/care/appointments` carries `for_member_id`; subject cleared afterwards. Existing ordering test: `family_member_id` sent for a known member, dropped for an unknown one.

## What I fixed
Nothing needed in client code; the open item was already implemented (`FamilyMemberView.tsx:103`). Added the missing test.

## Backend gaps (not changed)
- `backend/src/modules/care/appointments.service.ts:57-68` `assertFamilyBookingRight`: allows the group owner, or a member holding the `booking` permission. There is no minor/age/guardian concept: nothing makes a minor bookable only by a guardian, and an adult dependant is treated the same. "A minor cannot be booked without a guardian relation" is therefore only true in the sense that the booker must share a family group with the patient.
- `for_member_id` is accepted only by care appointments (`appointments.dto.ts:64`) and unified bookings (`unified-bookings.dto.ts:51`); health reminders also take it.

## Client gaps (reported, not built)
- Diagnostics and pharmacy flows: the member picked by "Book on their behalf" is only consumed by the consultation confirm form. The ordering screens have their own for-whom picker (`src/components/ordering/ContextBar.tsx:93-95`, `setMember`), but it is not pre-filled from `bookingFor`, and the button always opens the consultations tab. A guardian must re-pick the member in the ordering context bar.

## Not verified
- Live backend behaviour (`tools/live/j_family_book_for_member.py` not run: no backend in this environment).
- Device rendering.
