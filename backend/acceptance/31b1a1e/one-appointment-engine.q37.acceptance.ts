// ACCEPTANCE — 31b1a1e / Q37 / Q36 / Q41 (REVIEW_REAUDIT Round 12 Phase A #8). Written
// by the reviewer before the fix; the implementing agent makes it pass and may not
// edit it. ONE shared availability function (owner decision) used by the slot list,
// the doctor-list "next available" preview and booking (create / reschedule): the
// 5-minute buffer and other patients' holds apply everywhere, so every listed slot
// can be booked and nothing outside the list can.
// Owner decision (one availability engine): modules/doctors was a second
// doctor/appointment engine (own Doctor and DoctorAppointment collections, an
// invented DEFAULT_SCHEDULE of 09:00-17:00 for doctors with no hours, no buffer
// and no holds) serving public GET /doctors, /doctors/:id and /doctors/:id/slots.
// Doctors, slots and bookings live only in modules/care.
import fs from 'node:fs';
import path from 'node:path';

describe('one doctor and appointment engine (modules/care)', () => {
  const src = path.resolve(__dirname, '../../src/modules/..');
  it('the legacy doctors engine is not registered or present', () => {
    expect(fs.readFileSync(path.join(src, 'app.module.ts'), 'utf8')).not.toMatch(/DoctorsModule|modules\/doctors\//);
    expect(fs.existsSync(path.join(src, 'modules/doctors'))).toBe(false);
  });
});
