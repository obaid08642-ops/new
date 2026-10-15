import { NotFoundException } from '@nestjs/common';
import { CareService } from '../care.service';

// 2-web#3 / 2-app#13: a public doctor's photo and clinic photos are public addresses, served only for that doctor.
describe('CareService doctor photos', () => {
  const doctor = { id: 'd1', type: 'doctor', profile_photo: 'f-photo', clinic_images: ['f-clinic'], specialty: 'cardiology' };
  const providers: any = {
    findOne: (q: any) => {
      const hit = q.id === 'd1' ? doctor : null;
      return { lean: async () => hit, then: (ok: any, ko: any) => Promise.resolve(hit && { ...hit, toObject: () => hit }).then(ok, ko) };
    },
    find: () => ({ limit: async () => [] }),
    db: { collection: () => ({ find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }) }) },
  };
  const slots: any = { nextAvailable: async () => null };
  const storage: any = { publicProfileImage: async (id: string) => ({ mime: 'image/png', data: Buffer.from(id) }) };
  const service = new CareService(providers, {} as any, {} as any, slots, storage);

  it('gives the photo and clinic photos as the public media route, never the private file id', async () => {
    const out: any = await service.doctorById('d1');
    expect(out.photo_url).toBe('/api/v1/care/doctors/d1/media/f-photo');
    expect(out.clinicPhotos).toEqual(['/api/v1/care/doctors/d1/media/f-clinic']);
    expect(JSON.stringify(out)).not.toContain('"f-photo"');
  });

  it('serves only that doctor\'s own images', async () => {
    await expect(service.doctorMedia('d1', 'f-clinic')).resolves.toMatchObject({ mime: 'image/png' });
    await expect(service.doctorMedia('d1', 'f-other')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.doctorMedia('d2', 'f-photo')).rejects.toBeInstanceOf(NotFoundException);
  });
});
