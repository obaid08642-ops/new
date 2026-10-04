// WP-K: the doctor's "request medical services" screen posted to the patient
// booking routes (so the booking landed on the doctor's own account). It now
// creates a doctor order for the patient of the appointment.
const fs = require('fs');
const path = require('path');

test('RequestTestScreen sends a doctor order, not a patient booking', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'doctor', 'doctor', 'RequestTestScreen.tsx'), 'utf8');
  expect(src).toMatch(/client\.post\('\/provider\/doctor-orders'/);
  expect(src).not.toMatch(/'\/labs\/bookings'|'\/radiology\/bookings'|'\/home-care\/bookings'/);
});
