import 'reflect-metadata';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { RatingsService, AdminRatingsController } from './ratings.module';
import { SubmitDto } from './ratings.dto';
import { reviewerLabel } from './reviewer-label';
import { Permission } from '../../common/permissions';

/** Owner decision 2026-10-24: written reviews with sub-ratings, from a completed appointment only, once per appointment, moderated, first name + initial. */
describe('doctor reviews: sub-ratings, moderation, reviewer label', () => {
  const make = (opts: { appointment?: any; existing?: any } = {}) => {
    const rows: any[] = opts.existing ? [opts.existing] : [];
    const updates: any[] = [];
    const ratings = {
      findOne: async (q: any) => rows.find((r) => Object.entries(q).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$eq' in v ? r[k] === v.$eq : r[k] === v))) ?? null,
      insertOne: async (d: any) => { rows.push({ _id: `oid${rows.length}`, ...d }); },
      updateOne: async (q: any, u: any) => { updates.push(u.$set); const r = rows.find((x) => x._id === q._id); if (r) Object.assign(r, u.$set); },
      aggregate: () => ({ toArray: async () => [] }),
      countDocuments: async () => rows.filter((r) => r.status === 'pending').length,
      find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => rows.filter((r) => r.status === 'pending') }) }) }) }),
    };
    const profiles = { updateMany: jest.fn(async () => undefined) };
    const appts = { findOne: async () => opts.appointment === undefined ? { id: 'ap1', patient_id: 'pat1', status: 'COMPLETED', doctor_user_id: 'doc1' } : opts.appointment };
    const conn: any = { collection: (n: string) => (n === 'ratings' ? ratings : n === 'provider_profiles' ? profiles : appts) };
    const svc: any = new (RatingsService as any)(conn);
    return { svc, rows, updates, profiles };
  };
  const user = { id: 'pat1', full_name: 'Huda Al-Otaibi' };
  const body = (over: any = {}) => ({ entity_type: 'appointment', entity_id: 'ap1', provider_id: 'doc1', score: 5, ...over });

  it('a reviewer is shown as first name plus the initial of the last name, never more', () => {
    expect(reviewerLabel('Huda Al-Otaibi')).toBe('Huda A.');
    expect(reviewerLabel('Huda Khalid Al-Otaibi')).toBe('Huda A.');
    expect(reviewerLabel('Huda')).toBe('Huda');
    expect(reviewerLabel('  ')).toBeNull();
    expect(reviewerLabel(null)).toBeNull();
  });

  it('a written review waits for an admin; a stars-only rating counts at once', async () => {
    const written = make();
    expect(await written.svc.submit(user, body({ comment: 'Great doctor', sub_ratings: { doctor: 5, clinic: 4, waiting: 3 } }))).toMatchObject({ created: true, status: 'pending' });
    expect(written.rows[0]).toMatchObject({ status: 'pending', sub_ratings: { doctor: 5, clinic: 4, waiting: 3 }, comment: 'Great doctor' });
    expect(typeof written.rows[0].id).toBe('string');
    const stars = make();
    expect(await stars.svc.submit(user, body())).toMatchObject({ created: true, status: 'published' });
  });

  it('one review per appointment: a second submit edits it, and new text goes back to the admin', async () => {
    const t = make({ existing: { _id: 'o1', user_id: 'pat1', entity_type: 'appointment', entity_id: 'ap1', provider_id: 'doc1', score: 4, comment: 'ok', status: 'published' } });
    const r = await t.svc.submit(user, body({ comment: 'ok' }));
    expect(r).toMatchObject({ updated: true, status: 'published' });
    const r2 = await t.svc.submit(user, body({ comment: 'changed my mind' }));
    expect(r2).toMatchObject({ updated: true, status: 'pending' });
    expect(t.rows).toHaveLength(1);
  });

  it('only from a completed appointment of the reviewer; sub-ratings only on appointments and 1..5', async () => {
    await expect(make({ appointment: { id: 'ap1', patient_id: 'pat1', status: 'CONFIRMED', doctor_user_id: 'doc1' } }).svc.submit(user, body())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make({ appointment: { id: 'ap1', patient_id: 'someone-else', status: 'COMPLETED', doctor_user_id: 'doc1' } }).svc.submit(user, body())).rejects.toBeInstanceOf(ForbiddenException);
    await expect(make().svc.submit(user, body({ entity_type: 'lab_booking', sub_ratings: { doctor: 5 } }))).rejects.toBeInstanceOf(BadRequestException);
    expect(() => RatingsService.cleanSubRatings({ doctor: 6 })).toThrow('sub_rating_must_be_1_to_5');
    expect(() => RatingsService.cleanSubRatings({ clinic: 2.5 })).toThrow('sub_rating_must_be_1_to_5');
    expect(RatingsService.cleanSubRatings({ doctor: 5, hacker: 1 })).toEqual({ doctor: 5 });
    expect(RatingsService.cleanSubRatings({})).toBeUndefined();
  });

  it('the DTO validates the sub-ratings and the comment length', async () => {
    expect(await validate(plainToInstance(SubmitDto, { ...body(), sub_ratings: { doctor: 5, clinic: 1 } }))).toHaveLength(0);
    for (const bad of [{ sub_ratings: { doctor: 0 } }, { sub_ratings: { waiting: 5.5 } }, { comment: 'x'.repeat(1001) }]) {
      expect((await validate(plainToInstance(SubmitDto, { ...body(), ...bad }))).length).toBeGreaterThan(0);
    }
  });

  it('an admin approves or rejects a pending review; only pending ones, and the average is recomputed', async () => {
    const t = make({ existing: { _id: 'o1', id: 'rev1', user_id: 'pat1', provider_id: 'doc1', score: 5, comment: 'Great', status: 'pending' } });
    expect(await t.svc.moderate({ id: 'adm' }, 'rev1', 'approve')).toEqual({ ok: true, id: 'rev1', status: 'published' });
    expect(t.rows[0]).toMatchObject({ status: 'published', moderated_by: 'adm' });
    expect(t.profiles.updateMany).toHaveBeenCalled();
    await expect(t.svc.moderate({ id: 'adm' }, 'rev1', 'reject')).rejects.toBeInstanceOf(NotFoundException);
    const r = make({ existing: { _id: 'o2', id: 'rev2', provider_id: 'doc1', status: 'pending', comment: 'spam' } });
    expect(await r.svc.moderate({ id: 'adm' }, 'rev2', 'reject', 'spam')).toMatchObject({ status: 'rejected' });
    expect(r.rows[0].moderation_reason).toBe('spam');
  });

  it('the moderation routes are admin-only and need the moderate permission', () => {
    const roles = Reflect.getMetadata('roles', AdminRatingsController) ?? Reflect.getMetadata('ROLES', AdminRatingsController);
    expect(JSON.stringify(roles)).toContain('admin');
    for (const h of ['pending', 'approve', 'reject']) {
      const perms = Reflect.getMetadata('permissions', (AdminRatingsController.prototype as any)[h]) ?? Reflect.getMetadata('required_permissions', (AdminRatingsController.prototype as any)[h]);
      expect(JSON.stringify(perms)).toContain(Permission.REVIEWS_MODERATE);
    }
  });
});
