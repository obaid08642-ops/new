// ACCEPTANCE — D-1 community removed; doctor articles (owner decision 2026-10-06 item 1, issue #320;
// Queue C). Written by the reviewer before the work; the implementing agent makes it pass and may not
// edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Required
//   1. Community user posts are gone: every /community/* route answers 404. Their data is archived
//      first: scripts/migrations/2026-10-archive-community.ts (dry-run default, --apply writes;
//      MONGODB_URI, DB_NAME) copies community_posts, community_comments and community_live_sessions to
//      archive_<collection> (same _id, archived_at) and empties them; a rerun adds no duplicates.
//   2. Doctor articles inside /articles:
//      - POST /api/v1/doctor/articles (a doctor whose profile is admin-approved: medical_review_status
//        approved and license_verified) creates an article in review (not public); an unapproved doctor
//        and a patient get 403. GET /api/v1/doctor/articles lists the doctor's own.
//      - The admin approves (POST /api/v1/admin/articles/:id/approve) before it is public; reject with
//        a reason (POST /api/v1/admin/articles/:id/reject).
//      - The public article carries its author: { doctor_id } (the doctor's public profile id, for the
//        profile and booking links), never an account id, phone or email.
//      - No comments: there is no comment route on articles.
//      - No brand names of prescription-only medicines (catalogue requires_prescription, any locale
//        name): refused at submit (400) and again at approve (400) if the catalogue changed meanwhile.
import { spawnSync } from 'child_process';
import * as path from 'path';
import { JwtService } from '@nestjs/jwt';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const BACKEND = path.resolve(__dirname, '../..');

describe('D-1: community removed, doctor articles reviewed by the admin', () => {
  const stack = new LiveStack();
  let patient = '';
  let admin = '';
  let doctor = '';
  let pendingDoctor = '';
  const sign = (id: string) => new JwtService({ secret: JWT_SECRET }).sign({ id, sub: id, role: 'doctor' });
  const migrate = (apply: boolean) => spawnSync('npx', ['ts-node', '--transpile-only', 'scripts/migrations/2026-10-archive-community.ts', ...(apply ? ['--apply'] : [])], {
    cwd: BACKEND, encoding: 'utf8', env: { ...process.env, MONGODB_URI: stack.mongo.getUri(), DB_NAME: 'nabd_acceptance' },
  });
  const article = (title: string, body: string) => ({ title_ar: title, body_ar: body, excerpt_ar: body.slice(0, 40), category: 'general' });

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('users').insertMany([
        { id: 'doc-1', full_name: 'Dr One', role: 'doctor', active: true, phone: '+966500000901', email: 'dr1@example.test' },
        { id: 'doc-2', full_name: 'Dr Two', role: 'doctor', active: true },
      ]);
      await db.collection('provider_profiles').insertMany([
        { id: 'doc-prof-1', user_id: 'doc-1', account_id: 'doc-1', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', license_verified: true, name_ar: 'د. واحد' },
        { id: 'doc-prof-2', user_id: 'doc-2', account_id: 'doc-2', type: 'doctor', status: 'pending', public_eligibility: false, medical_review_status: 'pending', license_verified: false, name_ar: 'د. اثنان' },
      ]);
      await db.collection('medicines').insertMany([
        { id: 'med-rx', name_ar: 'أوجمنتين', name_en: 'Augmentin', requires_prescription: true, translations: { ur: { name: 'آگمینٹن' } } },
        { id: 'med-otc', name_ar: 'بنادول', name_en: 'Panadol', requires_prescription: false },
        { id: 'med-later', name_ar: 'فولتارين', name_en: 'Voltaren', requires_prescription: false },
      ]);
      await db.collection('community_posts').insertMany([{ id: 'cp-1', author_id: 'pat-1', title: 't', body: 'b', status: 'published' }, { id: 'cp-2', author_id: 'pat-2', title: 't2', body: 'b2', status: 'published' }]);
      await db.collection('community_comments').insertOne({ id: 'cc-1', post_id: 'cp-1', author_id: 'pat-2', body: 'c', status: 'published' });
      await db.collection('community_live_sessions').insertOne({ id: 'cl-1', title: 'live', status: 'upcoming', scheduled_at: new Date() });
    });
    patient = await stack.patient('pat-1');
    admin = await stack.admin('adm-1');
    doctor = sign('doc-1');
    pendingDoctor = sign('doc-2');
  });
  afterAll(async () => { await stack.stop(); });

  describe('community user posts are gone', () => {
    it.each([
      ['GET', '/api/v1/community/posts'], ['POST', '/api/v1/community/posts'], ['GET', '/api/v1/community/posts/cp-1'],
      ['POST', '/api/v1/community/posts/cp-1/comment'], ['PUT', '/api/v1/community/posts/cp-1/vote'], ['DELETE', '/api/v1/community/posts/cp-1'],
      ['GET', '/api/v1/community/live-sessions'], ['GET', '/api/v1/community/admin/pending'],
    ])('%s %s -> 404', async (m, p) => {
      for (const t of [patient, admin]) expect((await stack.call(0, m, p, t, m === 'GET' || m === 'DELETE' ? undefined : { title: 't', body: 'b', vote: 'up' })).status).toBe(404);
    });
    it('the data is archived before it leaves (dry-run, apply, rerun)', async () => {
      expect(migrate(false).status).toBe(0);
      expect(await stack.db.collection('community_posts').countDocuments({})).toBe(2);
      const r = migrate(true);
      expect([r.status, r.stderr.slice(-400)]).toEqual([0, expect.anything()]);
      for (const [c, n] of [['community_posts', 2], ['community_comments', 1], ['community_live_sessions', 1]] as const) {
        expect([c, await stack.db.collection(c).countDocuments({}), await stack.db.collection(`archive_${c}`).countDocuments({ archived_at: { $exists: true } })]).toEqual([c, 0, n]);
      }
      expect(migrate(true).status).toBe(0);
      expect(await stack.db.collection('archive_community_posts').countDocuments({})).toBe(2);
    });
  });

  describe('doctor articles', () => {
    let pendingId = '';
    it('only an approved doctor can write; patients and unapproved doctors get 403', async () => {
      expect((await stack.call(0, 'POST', '/api/v1/doctor/articles', patient, article('عنوان', 'نص طويل عن الصحة العامة'))).status).toBe(403);
      expect((await stack.call(0, 'POST', '/api/v1/doctor/articles', pendingDoctor, article('عنوان', 'نص طويل عن الصحة العامة'))).status).toBe(403);
      const r = await stack.call(0, 'POST', '/api/v1/doctor/articles', doctor, article('النوم الصحي', 'نصائح عامة للنوم الصحي وبنادول ليس علاجاً للأرق'));
      expect(r.status).toBeLessThan(300);
      pendingId = r.body?.id;
      expect(typeof pendingId).toBe('string');
    });
    it('the new article is not public until the admin approves it', async () => {
      const list = await stack.call(0, 'GET', '/api/v1/articles');
      expect(JSON.stringify(list.body)).not.toContain(pendingId);
      const mine = await stack.call(0, 'GET', '/api/v1/doctor/articles', doctor);
      expect(JSON.stringify(mine.body)).toContain(pendingId);
    });
    it('a prescription-only brand name is refused at submit, in any language', async () => {
      for (const name of ['أوجمنتين', 'Augmentin', 'augmentin', 'آگمینٹن']) {
        const r = await stack.call(0, 'POST', '/api/v1/doctor/articles', doctor, article('التهاب الحلق', `علاج الالتهاب يكون أحياناً ${name} حسب الطبيب`));
        expect([name, r.status]).toEqual([name, 400]);
      }
    });
    it('only the admin approves; then it is public with its author (public doctor id only)', async () => {
      expect((await stack.call(0, 'POST', `/api/v1/admin/articles/${pendingId}/approve`, doctor, {})).status).toBe(403);
      expect((await stack.call(0, 'POST', `/api/v1/admin/articles/${pendingId}/approve`, admin, {})).status).toBeLessThan(300);
      const a: any = await stack.db.collection('articles').findOne({ id: pendingId });
      const pub = await stack.call(0, 'GET', `/api/v1/articles/${a.slug}`);
      expect(pub.status).toBe(200);
      expect(pub.body?.author?.doctor_id).toBe('doc-prof-1');
      const s = JSON.stringify(pub.body);
      expect(s).not.toContain('+966500000901');
      expect(s).not.toContain('dr1@example.test');
      expect(s).not.toContain('"doc-1"');
    });
    it('approve re-checks the catalogue: a name that became prescription-only is refused', async () => {
      const r = await stack.call(0, 'POST', '/api/v1/doctor/articles', doctor, article('آلام الظهر', 'كثيرون يستعملون فولتارين للظهر'));
      expect(r.status).toBeLessThan(300);
      await stack.db.collection('medicines').updateOne({ id: 'med-later' }, { $set: { requires_prescription: true } });
      expect((await stack.call(0, 'POST', `/api/v1/admin/articles/${r.body.id}/approve`, admin, {})).status).toBe(400);
    });
    it('the admin can reject with a reason', async () => {
      const r = await stack.call(0, 'POST', '/api/v1/doctor/articles', doctor, article('الماء', 'شرب الماء مهم'));
      const rej = await stack.call(0, 'POST', `/api/v1/admin/articles/${r.body?.id}/reject`, admin, { reason: 'needs sources' });
      expect(rej.status).toBeLessThan(300);
      expect(JSON.stringify((await stack.call(0, 'GET', '/api/v1/articles')).body)).not.toContain(r.body?.id);
    });
    it('articles have no comments', async () => {
      const a: any = await stack.db.collection('articles').findOne({ id: pendingId });
      for (const p of [`/api/v1/articles/${a?.id}/comments`, `/api/v1/articles/${a?.slug}/comments`]) {
        expect((await stack.call(0, 'POST', p, patient, { body: 'hi' })).status).toBe(404);
      }
    });
  });
});
