// ACCEPTANCE — D-24 doctor chat only inside a booked consultation (owner decision 2026-10-06 item
// 24; Queue C). Written by the reviewer before the work; the implementing agent makes it pass and
// may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB and a local Redis.
//
// Required behaviour (chat API: /chat/threads/*; calls: /calls/initiate)
//   1. No free chat with a doctor: a patient cannot open a direct or group thread with a doctor
//      (even one they once booked); the only doctor thread is the booking thread
//      (POST /chat/threads/booking). The compat POST /consultations/:id/messages may not bypass the
//      rules (refused or gone: 400/403/404/410).
//   2. Online (video) consultation: from confirmation until 72 h after completion: text, images,
//      files and voice notes; the call is allowed while it is active.
//   3. Clinic or home visit: nothing before the doctor marks it completed; after completion, for
//      72 h (admin-editable), text, images and files only: no voice note and no call.
//   4. After the window the thread is read-only (reading still works); the permissions answer says so
//      and offers "book a follow-up".
//   5. The doctor can close a thread early (POST /chat/threads/:id/close) and extend it once
//      (POST /chat/threads/:id/extend, another 72 h); a second extension is refused (400). Only the
//      thread's doctor may do either (the patient gets 403).
//   6. Every consultation thread's permissions answer carries the emergency line "997".
import { JwtService } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { LiveStack, JWT_SECRET } from './live-server';

jest.setTimeout(600_000);

const HOUR = 3_600_000;

describe('D-24: doctor chat only inside a booked consultation', () => {
  const stack = new LiveStack();
  let patient = '';
  let doctor = '';
  const t0 = Date.now();
  const threads: Record<string, string> = {};

  const appt = (id: string, type: string, status: string, completedHoursAgo?: number) => ({
    id, patient_id: 'pat-1', doctor_id: 'doc-prof', doctor_user_id: 'doc-1', service_type: type, status,
    slot_start: new Date(t0 - (completedHoursAgo ?? -3) * HOUR - HOUR), slot_end: new Date(t0 - (completedHoursAgo ?? -3) * HOUR - 0.5 * HOUR),
    duration_minutes: 30, total_price: 200, payment_method: 'card', payment_status: 'paid',
    ...(completedHoursAgo !== undefined ? { completed_at: new Date(t0 - completedHoursAgo * HOUR) } : {}),
    createdAt: new Date(t0 - 200 * HOUR), updatedAt: new Date(t0 - (completedHoursAgo ?? 0) * HOUR),
  });
  const send = (thread: string, body: Record<string, unknown>, token = patient) =>
    stack.call(0, 'POST', `/api/v1/chat/threads/${threads[thread]}/messages`, token, { client_message_id: randomUUID(), ...body });
  const media = async (thread: string, mime: string) => {
    const id = randomUUID();
    await stack.db.collection('media_assets').insertOne({ id, key: `chat/${id}`, owner_id: 'pat-1', purpose: 'chat', thread_id: threads[thread], mime_type: mime, size_bytes: 1000, original_name: 'x', createdAt: new Date() });
    return id;
  };
  const ok = (r: { status: number }) => r.status < 300;

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      await db.collection('users').insertOne({ id: 'doc-1', full_name: 'Dr', role: 'doctor', active: true });
      await db.collection('provider_profiles').insertOne({ id: 'doc-prof', user_id: 'doc-1', account_id: 'doc-1', type: 'doctor', status: 'active', public_eligibility: true, medical_review_status: 'approved', consultation_modes: ['clinic', 'video', 'home'], name_ar: 'د' });
      await db.collection('appointments').insertMany([
        appt('video-active', 'video', 'CONFIRMED'),
        appt('video-30h', 'video', 'COMPLETED', 30),
        appt('video-80h', 'video', 'COMPLETED', 80),
        appt('clinic-before', 'clinic', 'CONFIRMED'),
        appt('clinic-1h', 'clinic', 'COMPLETED', 1),
        appt('clinic-30h', 'clinic', 'COMPLETED', 30),
        appt('home-1h', 'home', 'COMPLETED', 1),
        appt('clinic-80h', 'clinic', 'COMPLETED', 80),
        appt('clinic-extend', 'clinic', 'COMPLETED', 80),
        appt('clinic-close', 'clinic', 'COMPLETED', 1),
      ]);
    });
    patient = await stack.patient('pat-1');
    doctor = new JwtService({ secret: JWT_SECRET }).sign({ id: 'doc-1', sub: 'doc-1', role: 'doctor' });
    for (const id of ['video-active', 'video-30h', 'video-80h', 'clinic-before', 'clinic-1h', 'clinic-30h', 'home-1h', 'clinic-80h', 'clinic-extend', 'clinic-close']) {
      const r = await stack.call(0, 'POST', '/api/v1/chat/threads/booking', patient, { booking_kind: 'consultation', booking_id: id });
      threads[id] = r.body?.id || r.body?.thread?.id || r.body?._id;
    }
  });
  afterAll(async () => { await stack.stop(); });

  it('every booking has its own thread', () => {
    for (const [k, v] of Object.entries(threads)) expect([k, typeof v === 'string' && v.length > 0]).toEqual([k, true]);
  });

  describe('no free chat with a doctor', () => {
    it('a patient cannot open a direct thread with a doctor, even one they booked', async () => {
      const r = await stack.call(0, 'POST', '/api/v1/chat/threads/direct', patient, { other_user_id: 'doc-1' });
      expect(ok(r)).toBe(false);
    });
    it('a patient cannot open a group thread with a doctor', async () => {
      const r = await stack.call(0, 'POST', '/api/v1/chat/threads/group', patient, { participant_ids: ['doc-1'], name: 'chat' });
      expect(ok(r)).toBe(false);
    });
    it('the compat consultation messages route does not bypass the rules', async () => {
      const r = await stack.call(0, 'POST', '/api/v1/consultations/clinic-before/messages', patient, { body: 'hello doctor' });
      expect([400, 403, 404, 410]).toContain(r.status);
    });
  });

  describe('online consultation', () => {
    it('active: text, image, file and voice note are all allowed', async () => {
      expect(ok(await send('video-active', { body: 'hello' }))).toBe(true);
      expect(ok(await send('video-active', { type: 'image', media_ids: [await media('video-active', 'image/jpeg')] }))).toBe(true);
      expect(ok(await send('video-active', { type: 'file', media_ids: [await media('video-active', 'application/pdf')] }))).toBe(true);
      expect(ok(await send('video-active', { type: 'voice', duration_seconds: 5, media_ids: [await media('video-active', 'audio/m4a')] }))).toBe(true);
    });
    it('30 h after completion it is still open (window 72 h)', async () => {
      expect(ok(await send('video-30h', { body: 'follow-up question' }))).toBe(true);
    });
    it('80 h after completion it is read-only (reading still works)', async () => {
      expect(ok(await send('video-80h', { body: 'late' }))).toBe(false);
      expect((await stack.call(0, 'GET', `/api/v1/chat/threads/${threads['video-80h']}/messages`, patient)).status).toBe(200);
    });
  });

  describe('clinic and home visits', () => {
    it('before the doctor completes the visit: no chat and no call', async () => {
      expect(ok(await send('clinic-before', { body: 'before the visit' }))).toBe(false);
      const call = await stack.call(0, 'POST', '/api/v1/calls/initiate', patient, { booking_id: 'clinic-before', callee_id: 'doc-1', call_type: 'video' });
      expect(ok(call)).toBe(false);
    });
    it('after completion: text, images and files', async () => {
      expect(ok(await send('clinic-1h', { body: 'thank you, one question' }))).toBe(true);
      expect(ok(await send('clinic-1h', { type: 'image', media_ids: [await media('clinic-1h', 'image/png')] }))).toBe(true);
      expect(ok(await send('clinic-1h', { type: 'file', media_ids: [await media('clinic-1h', 'application/pdf')] }))).toBe(true);
      expect(ok(await send('home-1h', { body: 'after the home visit' }))).toBe(true);
    });
    it('after completion: no voice note', async () => {
      expect(ok(await send('clinic-1h', { type: 'voice', duration_seconds: 4, media_ids: [await media('clinic-1h', 'audio/m4a')] }))).toBe(false);
      expect(ok(await send('home-1h', { type: 'voice', duration_seconds: 4, media_ids: [await media('home-1h', 'audio/mpeg')] }))).toBe(false);
    });
    it('after completion: no call', async () => {
      const call = await stack.call(0, 'POST', '/api/v1/calls/initiate', patient, { booking_id: 'clinic-1h', callee_id: 'doc-1', call_type: 'audio' });
      expect(ok(call)).toBe(false);
    });
    it('the window is 72 h: open at 30 h, read-only at 80 h', async () => {
      expect(ok(await send('clinic-30h', { body: 'day two' }))).toBe(true);
      expect(ok(await send('clinic-80h', { body: 'day four' }))).toBe(false);
    });
  });

  describe('the doctor closes or extends once', () => {
    it('only the doctor may close; after closing the patient cannot write', async () => {
      expect((await stack.call(0, 'POST', `/api/v1/chat/threads/${threads['clinic-close']}/close`, patient, {})).status).toBe(403);
      expect(ok(await stack.call(0, 'POST', `/api/v1/chat/threads/${threads['clinic-close']}/close`, doctor, {}))).toBe(true);
      expect(ok(await send('clinic-close', { body: 'are you there?' }))).toBe(false);
    });
    it('the doctor extends an expired thread once; the patient can write again; a second extension is refused', async () => {
      expect(ok(await send('clinic-extend', { body: 'expired' }))).toBe(false);
      expect((await stack.call(0, 'POST', `/api/v1/chat/threads/${threads['clinic-extend']}/extend`, patient, {})).status).toBe(403);
      expect(ok(await stack.call(0, 'POST', `/api/v1/chat/threads/${threads['clinic-extend']}/extend`, doctor, {}))).toBe(true);
      expect(ok(await send('clinic-extend', { body: 'thanks for extending' }))).toBe(true);
      expect((await stack.call(0, 'POST', `/api/v1/chat/threads/${threads['clinic-extend']}/extend`, doctor, {})).status).toBe(400);
    });
  });

  describe('what the thread shows', () => {
    it('every consultation thread carries the emergency line 997', async () => {
      for (const id of ['video-active', 'clinic-1h', 'clinic-80h']) {
        const r = await stack.call(0, 'GET', `/api/v1/chat/threads/${threads[id]}/permissions`, patient);
        expect([id, r.status, JSON.stringify(r.body).includes('997')]).toEqual([id, 200, true]);
      }
    });
    it('an expired thread is read-only and offers a follow-up booking', async () => {
      const r = await stack.call(0, 'GET', `/api/v1/chat/threads/${threads['clinic-80h']}/permissions`, patient);
      expect(r.body?.can_chat).toBe(false);
      expect(JSON.stringify(r.body)).toMatch(/book_follow_up|follow_up_booking|book_followup/);
    });
  });
});
