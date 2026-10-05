// One appointment engine: the doctor screen prefetches the doctor the booking
// flow uses (GET /care/doctors/:id), not the removed legacy /doctors/:id.
import fs from 'node:fs';
import path from 'node:path';

it('prefetchDoctorContext warms /care/doctors/:id', () => {
  const src = fs.readFileSync(path.resolve(__dirname, 'prefetch.ts'), 'utf8');
  expect(src).toContain('prefetchApi(`/care/doctors/${doctorId}`');
  expect(src).not.toMatch(/prefetchApi\(`\/doctors\//);
});
