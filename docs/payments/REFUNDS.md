# Refunds: what the server does

Owner decisions of 2026-11-09, 2026-11-10 and 2026-11-13. Every refund goes back to the original payment (the card, through the gateway); there is no wallet credit.

## Consultations (`AppointmentsService.calculateRefund`, shared by cancel and the refund preview)

| Case | Refund |
|---|---|
| Patient cancels 2 h or more before the start | 100 % |
| Patient cancels inside the last 2 h | 50 % (`late_refund_percent`) |
| Patient cancels inside the last 2 h and the doctor has **no free slot in the next 14 days** | **100 %** (the free reschedule offered instead cannot land anywhere) |
| Patient no-show | 0 % (`patient_no_show_percent`) |
| The visit made by the one late free reschedule, cancelled inside the last 2 h | 0 % (no way round the late percentage; this case is not upgraded by the no-free-slot rule) |
| Doctor, facility or admin cancels (including the rescheduled visit) | 100 % (the doctor penalty stays) |
| The provider did not attend | 100 % |

"No free slot" is read from the doctor's real schedule (`SlotService.slotsForDate`, the same source as the booking screens) for today and the next 14 days. If the schedule cannot be read, the normal late percentage applies: never a full refund by accident.

Tests: `backend/src/modules/care/appointments-no-free-slot-refund.spec.ts`.

## After launch (not built)

- **Free reschedule for lab, radiology and home nursing.** Not at launch (their slots and crews are fixed). At launch they follow the same 2 h table: 2 h or more before the start 100 %, inside the last 2 h 50 %. A free reschedule for them is an after-launch item (owner decision 2026-11-13).
