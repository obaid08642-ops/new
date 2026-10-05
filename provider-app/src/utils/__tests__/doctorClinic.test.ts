import { doctorClinicFields } from '../doctorClinic';

// d0b9ce9 / R83: the doctor registration collects the clinic name and the clinic
// street address ("العنوان والعيادة" section); Step3Dto accepts clinic_name and
// clinic_address, and /care/doctors/:id shows clinic_address. No client sent it.
describe('doctorClinicFields (R83 clinic name/address)', () => {
  it('sends the clinic street address as clinic_address with the clinic name', () => {
    expect(doctorClinicFields({ clinicName: ' عيادة النخبة ', address: ' شارع العليا 12 ' })).toEqual({
      clinic_name: 'عيادة النخبة',
      clinic_address: 'شارع العليا 12',
    });
  });

  it('omits empty values instead of sending blanks', () => {
    expect(doctorClinicFields({ clinicName: '', address: '   ' })).toEqual({ clinic_name: undefined, clinic_address: undefined });
    expect(doctorClinicFields({})).toEqual({ clinic_name: undefined, clinic_address: undefined });
  });
});
