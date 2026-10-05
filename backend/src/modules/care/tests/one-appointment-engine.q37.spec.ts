// Owner decision (one availability engine): modules/doctors was a second
// doctor/appointment engine (own Doctor and DoctorAppointment collections, an
// invented DEFAULT_SCHEDULE of 09:00-17:00 for doctors with no hours, no buffer
// and no holds) serving public GET /doctors, /doctors/:id and /doctors/:id/slots.
// Doctors, slots and bookings live only in modules/care.
import fs from 'node:fs';
import path from 'node:path';

describe('one doctor and appointment engine (modules/care)', () => {
  const src = path.resolve(__dirname, '../../..');
  it('the legacy doctors engine is not registered or present', () => {
    expect(fs.readFileSync(path.join(src, 'app.module.ts'), 'utf8')).not.toMatch(/DoctorsModule|modules\/doctors\//);
    expect(fs.existsSync(path.join(src, 'modules/doctors'))).toBe(false);
  });
});
