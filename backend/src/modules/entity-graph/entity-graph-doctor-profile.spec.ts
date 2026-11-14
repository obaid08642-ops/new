import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { EntityGraphService } from './entity-graph.service';
import { ConditionSchema } from './schemas/condition.schema';
import { RatingsService } from '../ratings/ratings.module';

jest.setTimeout(120_000);

/**
 * Design G3 (owner review): the public doctor page reads one payload, GET /entity-graph/related/doctor/:slug. It must carry what the
 * full profile (GET /care/doctors/:id) has: the large photo, the clinic photos, bio, languages, education, rating and the latest
 * reviews, with no private field and no placeholder.
 */
describe('entity graph: the public doctor page carries the full profile', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: EntityGraphService;
  const ok = { public_eligibility: true, medical_review_status: 'approved', status: 'active', type: 'doctor' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'eg_doctor' }).asPromise();
    const db = conn.db!;
    await db.collection('provider_profiles').insertMany([
      {
        ...ok, id: 'd-full', slug: 'dr-full', name_ar: 'د. فهد', specialty: 'cardiology',
        profile_photo: 'file-photo-1', clinic_images: ['file-clinic-1', 'https://cdn.example.test/clinic-2.jpg'],
        bio: 'Interventional cardiologist.', languages: ['ar', 'en'],
        education: [{ university: 'KSU', graduation_year: 2008, fellowship_board: 'SBC', private_note: 'hidden' }],
        rating_avg: 4.6, rating_count: 12, sub_ratings_avg: { doctor: 4.8, clinic: 4.5, waiting: 4.0 },
        // never part of the public model
        national_id: '1234567890', personal_address: 'home', license_documents: ['doc-1'],
      },
      { ...ok, id: 'd-bare', slug: 'dr-bare', name_ar: 'د. سارة', specialty: 'dermatology' },
    ]);
    const ratings = db.collection('ratings');
    const now = Date.now();
    await ratings.insertMany([
      ...Array.from({ length: 7 }, (_, i) => ({ provider_id: 'd-full', status: 'published', score: 5 - (i % 3), comment: `ok ${i}`, user_name: 'Layla Hassan', user_id: `u${i}`, createdAt: new Date(now - i * 1000) })),
      { provider_id: 'd-full', status: 'pending', score: 1, comment: 'not yet moderated', user_name: 'Omar Ali', user_id: 'u-p', createdAt: new Date(now + 5000) },
      { provider_id: 'd-full', status: 'rejected', score: 1, comment: 'rejected', user_name: 'Omar Ali', user_id: 'u-r', createdAt: new Date(now + 6000) },
    ]);
    const conditions = conn.model('Condition', ConditionSchema);
    svc = new EntityGraphService(conditions as any, {} as any, conn, {} as any, new RatingsService(conn));
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('sends the large photo, the gallery, the bio, the languages, the education and the rating', async () => {
    const r: any = await svc.getRelated('doctor', 'dr-full');
    expect(r.entity).toMatchObject({
      photo_url: '/api/v1/care/doctors/d-full/media/file-photo-1',
      clinicPhotos: ['/api/v1/care/doctors/d-full/media/file-clinic-1', 'https://cdn.example.test/clinic-2.jpg'],
      bio: 'Interventional cardiologist.',
      languages: ['ar', 'en'],
      education: [{ university: 'KSU', graduation_year: 2008, fellowship_board: 'SBC' }],
      rating_avg: 4.6, rating_count: 12, reviews_count: 12,
      sub_ratings: { doctor: 4.8, clinic: 4.5, waiting: 4.0 },
    });
  });

  it('sends nothing private', async () => {
    const text = JSON.stringify(await svc.getRelated('doctor', 'dr-full'));
    for (const secret of ['1234567890', 'personal_address', 'license_documents', 'doc-1', 'private_note', 'hidden']) expect(text).not.toContain(secret);
  });

  it('the latest reviews: published only, newest first, the first page of five, the reviewer by first name and initial', async () => {
    const r: any = await svc.getRelated('doctor', 'dr-full');
    expect(r.entity.reviews).toMatchObject({ total: 7, page: 1, total_pages: 2, count: 7 });
    expect(r.entity.reviews.data).toHaveLength(5);
    expect(r.entity.reviews.data.map((x: any) => x.comment)).toEqual(['ok 0', 'ok 1', 'ok 2', 'ok 3', 'ok 4']);
    expect(r.entity.reviews.data[0].reviewer).toBe('Layla H.');
    expect(JSON.stringify(r.entity.reviews)).not.toMatch(/u\d|user_id|Omar|not yet moderated|rejected/);
  });

  it('a doctor with no photo, gallery, bio, education or reviews shows none (no placeholder)', async () => {
    const r: any = await svc.getRelated('doctor', 'dr-bare');
    expect(r.entity).toMatchObject({ photo_url: null, clinicPhotos: [], bio: null, languages: [], education: [], rating: null, rating_avg: null, rating_count: null });
    expect(r.entity.reviews).toMatchObject({ data: [], total: 0, count: 0 });
  });

  it('without the ratings service the page still answers, with an empty list', async () => {
    const conditions = conn.model('Condition', ConditionSchema);
    const bare = new EntityGraphService(conditions as any, {} as any, conn, {} as any);
    const r: any = await bare.getRelated('doctor', 'dr-full');
    expect(r.entity.reviews.data).toEqual([]);
    expect(r.entity.photo_url).toBe('/api/v1/care/doctors/d-full/media/file-photo-1');
  });
});
