import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ageYears, buildDependant, isMinor, shapeDependant, MAX_DEPENDANTS } from './dependants';
import { FamilyService } from './family.service';
import { CreateDependantDto } from './family.dto';
import { resolveFamilyMemberId } from '../../common/family-member';

// PT-03: a guardian adds a minor with no account of their own; the consent is stored; only the guardian can use or list the record.
const NOW = new Date('2026-11-09T10:00:00Z');
const ok = { name: '  Sara  ', birth_date: '2018-03-15', relation_code: 'child', gender: 'female', guardian_consent: true };

describe('dependant rules', () => {
  it('age counts whole years: the birthday counts on the day', () => {
    expect(ageYears(new Date('2008-11-09T00:00:00Z'), NOW)).toBe(18);
    expect(ageYears(new Date('2008-11-10T00:00:00Z'), NOW)).toBe(17);
    expect(isMinor('2008-11-10', NOW)).toBe(true);
    expect(isMinor('2008-11-09', NOW)).toBe(false);
    expect(isMinor(undefined, NOW)).toBe(false);
  });

  it('a record is built with the guardian as owner, the minor flag, and the consent stored with its time and author', () => {
    const d = buildDependant('g1', ok, NOW);
    expect(d).toMatchObject({ owner_id: 'g1', user_id: 'g1', name: 'Sara', relation_code: 'child', gender: 'female', is_minor: true });
    expect(d.guardian_consent).toEqual({ given: true, at: NOW, by: 'g1' });
    expect(d.birth_date.toISOString()).toBe('2018-03-15T00:00:00.000Z');
    expect(typeof d.id).toBe('string');
  });

  it('without the guardian\'s consent nothing is built', () => {
    for (const c of [undefined, false, 'true', 1]) expect(() => buildDependant('g1', { ...ok, guardian_consent: c }, NOW)).toThrow('guardian_consent_required');
  });

  it('bad name, birth date, relation or gender are 400s', () => {
    expect(() => buildDependant('g1', { ...ok, name: '   ' }, NOW)).toThrow('dependant_name_invalid');
    expect(() => buildDependant('g1', { ...ok, name: 'x'.repeat(81) }, NOW)).toThrow('dependant_name_invalid');
    expect(() => buildDependant('g1', { ...ok, birth_date: '2030-01-01' }, NOW)).toThrow('birth_date_invalid');
    expect(() => buildDependant('g1', { ...ok, birth_date: '1800-01-01' }, NOW)).toThrow('birth_date_invalid');
    expect(() => buildDependant('g1', { ...ok, birth_date: 'yesterday' }, NOW)).toThrow('birth_date_invalid');
    expect(() => buildDependant('g1', { ...ok, relation_code: 'friend' }, NOW)).toThrow('relation_invalid');
    expect(() => buildDependant('g1', { ...ok, gender: 'x' }, NOW)).toThrow('gender_invalid');
    expect(() => buildDependant('g1', { ...ok, gender: undefined }, NOW)).not.toThrow();
  });

  it('the guardian sees the minor flag recomputed at read time, and never the owner or the raw consent author', () => {
    const d = buildDependant('g1', { ...ok, birth_date: '2008-11-10' }, NOW);
    expect(shapeDependant(d, NOW).is_minor).toBe(true);
    expect(shapeDependant(d, new Date('2026-11-10T10:00:00Z')).is_minor).toBe(false);
    const shaped: any = shapeDependant(d, NOW);
    expect(shaped.owner_id).toBeUndefined();
    expect(shaped.guardian_consent_at).toEqual(NOW);
  });

  it('the DTO takes the five fields and nothing odd', async () => {
    expect(await validate(plainToInstance(CreateDependantDto, ok))).toHaveLength(0);
    expect((await validate(plainToInstance(CreateDependantDto, { ...ok, relation_code: 'friend' }))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(CreateDependantDto, { ...ok, guardian_consent: 'yes' }))).length).toBeGreaterThan(0);
    expect((await validate(plainToInstance(CreateDependantDto, { ...ok, birth_date: 'x' }))).length).toBeGreaterThan(0);
  });
});

describe('dependants through the family service', () => {
  function build(rows: any[] = []) {
    const store = [...rows];
    const matches = (r: any, f: any) => Object.entries(f).every(([k, v]: [string, any]) => (v && typeof v === 'object' && '$ne' in v) ? r[k] !== v.$ne : (v && typeof v === 'object' && '$eq' in v) ? r[k] === v.$eq : r[k] === v);
    const coll: any = {
      countDocuments: jest.fn(async (f: any) => store.filter((r) => matches(r, f)).length),
      insertOne: jest.fn(async (d: any) => { store.push(d); }),
      find: jest.fn((f: any) => ({ sort: () => ({ toArray: async () => store.filter((r) => matches(r, f)) }) })),
      updateOne: jest.fn(async (f: any, u: any) => { const r = store.find((x) => matches(x, f)); if (r) Object.assign(r, u.$set); return { matchedCount: r ? 1 : 0 }; }),
      findOne: jest.fn(async (f: any) => store.find((r) => matches(r, { id: f.id.$eq, is_deleted: f.is_deleted }) && [r.owner_id, r.user_id, r.patient_id].some((x) => f.$or.some((c: any) => Object.values(c)[0] === x))) ?? null),
    };
    const conn: any = { collection: jest.fn(() => coll) };
    const svc = new FamilyService(conn, {} as never, {} as never, {} as never);
    return { svc, coll, store, db: conn };
  }

  it('the guardian adds, lists and removes; another account sees and removes nothing of theirs', async () => {
    const { svc } = build();
    const added = await svc.addDependant('g1', ok);
    expect(added).toMatchObject({ name: 'Sara', is_minor: true });
    expect((await svc.listDependants('g1')).map((d: any) => d.id)).toEqual([added.id]);
    expect(await svc.listDependants('stranger')).toEqual([]);
    await expect(svc.removeDependant('stranger', added.id)).rejects.toBeInstanceOf(NotFoundException);
    expect(await svc.removeDependant('g1', added.id)).toEqual({ success: true });
    expect(await svc.listDependants('g1')).toEqual([]);
    await expect(svc.removeDependant('g1', added.id)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('consent is required by the service and nothing is stored without it', async () => {
    const { svc, coll } = build();
    await expect(svc.addDependant('g1', { ...ok, guardian_consent: false })).rejects.toBeInstanceOf(BadRequestException);
    expect(coll.insertOne).not.toHaveBeenCalled();
  });

  it('the number of dependants per guardian is capped', async () => {
    const { svc } = build(Array.from({ length: MAX_DEPENDANTS }, (_, i) => ({ id: `d${i}`, owner_id: 'g1' })));
    await expect(svc.addDependant('g1', ok)).rejects.toThrow('dependants_limit_reached');
  });

  it('a booking can name the guardian\'s dependant; not a stranger\'s, not a removed one', async () => {
    const { svc, db } = build();
    const d = await svc.addDependant('g1', ok);
    expect(await resolveFamilyMemberId(db, 'g1', d.id)).toBe(d.id);
    await expect(resolveFamilyMemberId(db, 'stranger', d.id)).rejects.toBeInstanceOf(NotFoundException);
    await svc.removeDependant('g1', d.id);
    await expect(resolveFamilyMemberId(db, 'g1', d.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
