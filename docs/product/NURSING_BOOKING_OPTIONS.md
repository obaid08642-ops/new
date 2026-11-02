# Nursing booking: durations and recurrences (owner 2026-10-29), fields for Design

Backend: `backend/src/modules/home-care/booking-mode.ts`. One model, three shapes by `booking_mode` of the service (the service decides; a request that names another mode is refused).

## What the apps read
`GET /home-care/services` and `GET /home-care/services/:id` return, per service, `booking_mode` and **`booking_options` = what the server will accept** (the admin's own lists when an admin edited them, otherwise the defaults below; a row still holding the lists first seeded with the catalogue gets the defaults, so nothing has to be migrated). Build the booking screen from these lists, not from constants.

| `booking_mode` | The patient chooses | Fields in the booking / quote request | `booking_options` keys |
|---|---|---|---|
| `continuous` (elder care and similar: a DURATION) | hours per day, day or night shift, how long | `hours` 1, 2, 4, 8, 12, 24; `shift` day, night; `period` day, **days**, week, month, open; **`days`** 1 to 30 when `period` is `days` | `hours[]`, `shift[]`, `period[]`, `max_days` |
| `visit` (everything else: a RECURRENCE) | how often, how many times | `recurrence` once, daily, weekly, monthly; `sessions_count` = "for N times", 1 to 30 (`once` is always 1) | `recurrence[]`, `max_times` |
| `programme` | a package of sessions | `sessions_count` from the list | `sessions[]` |

Errors (400, the message is the code): `booking_mode_mismatch`, `booking_options_required` (some of hours/shift/period without the others), `booking_hours_not_offered`, `booking_shift_not_offered`, `booking_period_not_offered`, `booking_days_out_of_range`, `booking_recurrence_not_offered`, `booking_times_need_recurrence` (a count above 1 with `once`), `booking_times_out_of_range`, `booking_sessions_not_offered`, `service_price_not_set`. An older client that sends only `sessions_count` and no `recurrence` books "daily for N days", as before; one that sends no choice at all books one unit.

## Price (server only; the client never sends or computes a total)
`total = unit price x billable units`. The unit price is the chosen nurse's own price for the service, else the catalogue price. Billable units:
- `visit`, `programme`: the number of visits or sessions (`sessions_count`).
- `continuous`: `ceil(hours x days / hours per unit)`. Days: day 1, `days` N, week 7, month 30, open 1 (an open-ended period bills the first day). Hours per unit: `duration` = `hour` with `duration_value` n means the price covers n hours (1 when absent); `duration` = `shift` means 12 hours.

`GET /bookings/quote?kind=nursing&service_id=...&provider_id=...&hours=12&shift=day&period=week` returns the same figure as the booking: the line `visits` (qty = billable units, `unit_price`, `amount`), VAT, `total`, and `booking` = the choice as the server understood it plus `billable_units` and `unit_price`. Show that, never a local calculation. The stored booking carries `sessions_count` (visits), `recurrence`, `hours`, `shift`, `period`, `days`, `billable_units`, `total`.

## Assumptions the owner must confirm (not in any earlier decision)
1. Continuous prices are per unit hour, times hours x days. A competitor pattern (UK and US home-care agencies) bills hourly care by the hour but 24 h or live-in care as a **flat daily or weekly rate**; if the owner wants that, a 24 h row needs its own flat price (a different unit) rather than hours x hourly price. One function (`billableUnits`) holds the rule.
2. A month is 30 days, a week 7; "open" bills the first day.
3. The limits: at most 30 visits and at most 30 days per booking (a service can only lower them with `max_times` / `max_days`).
4. 1 h and 2 h are offered by default for every continuous service; an admin removes them per service in the catalogue editor (`booking_options.hours`).
