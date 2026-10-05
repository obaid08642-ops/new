// d0b9ce9 / R83: no provider-app screen sent clinic_address (Step3Dto accepts it,
// /care/doctors/:id returns it). The doctor registration step-3 request is built
// inside the multi-step screen, so this checks the request spreads the tested
// clinic fields (src/utils/doctorClinic.ts, covered by doctorClinic.test.ts).
const fs = require('fs');
const path = require('path');

describe('doctor registration sends the clinic address (R83)', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'doctor', 'DoctorRegistration.tsx'), 'utf8');
  const start = src.indexOf('await ProviderApi.step3({');
  const end = src.indexOf('});', start);

  it('the step-3 request includes clinic_name and clinic_address through doctorClinicFields', () => {
    expect(start).toBeGreaterThan(-1);
    expect(src.slice(start, end)).toContain('...doctorClinicFields(data)');
  });

  it('some provider-app source now sends clinic_address', () => {
    const helper = fs.readFileSync(path.join(__dirname, '..', '..', 'utils', 'doctorClinic.ts'), 'utf8');
    expect(helper).toContain('clinic_address:');
  });
});
