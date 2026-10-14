/** Q-22: public nurse endpoint returns only the allow-list, 404 when missing. */
import { NotFoundException } from '@nestjs/common';
import { PatientNurseProfileController } from './nurse-profile.controller';

const ctrlWith = (doc: any) => {
  const conn: any = { db: { collection: () => ({ findOne: async () => doc }) } };
  return new PatientNurseProfileController(conn);
};

describe('Q-22 public nurse view', () => {
  const doc = {
    id: 'n1', name: 'N', photo: 'p.jpg', specialties: ['icu'], languages: ['ar'],
    rating: 4.5, verified: true, scfhs_licence: 'L-1',
    phone: '+9665', email: 'n@x.y', address: 'secret', national_id: '123',
  };

  it('anonymous caller gets only public keys', async () => {
    const out: any = await ctrlWith(doc).one('n1');
    expect(out.data.name).toBe('N');
    expect(out.data.scfhs_licence).toBe('L-1');
    expect(out.data.phone).toBeUndefined();
    expect(out.data.email).toBeUndefined();
    expect(out.data.address).toBeUndefined();
    expect(out.data.national_id).toBeUndefined();
  });

  it('keeps the name when the doc uses name_ar/name_en (external seed shape)', async () => {
    const out: any = await ctrlWith({ id: 'n2', name_ar: 'م', name_en: 'M', phone: 'x' }).one('n2');
    expect(out.data.name_ar).toBe('م');
    expect(out.data.phone).toBeUndefined();
  });

  it('unknown id -> 404', async () => {
    await expect(ctrlWith(null).one('missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});
