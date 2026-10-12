import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { NotFoundException } from '@nestjs/common';
import { EntityGraphService } from './entity-graph.service';
import { ConditionSchema } from './schemas/condition.schema';

jest.setTimeout(120_000);

/**
 * SEO (owner 2026-10-12): the public entity pages (/doctor, /facility, /pharmacy, /condition, /p)
 * read only reviewed, published entities, and show no invented value (no default rating).
 */
describe('entity graph: public pages read governed entities only', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: EntityGraphService;
  const ok = { public_eligibility: true, medical_review_status: 'approved' };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'eg' }).asPromise();
    const db = conn.db!;
    await db.collection('provider_profiles').insertMany([
      { ...ok, id: 'd-ok', slug: 'dr-ok', type: 'doctor', status: 'active', specialty: 'cardiology', name_ar: 'د', facility_id: 'f-ok', consultation_modes: ['video'] },
      { id: 'd-pending', slug: 'dr-pending', type: 'doctor', status: 'active', public_eligibility: false, medical_review_status: 'pending', specialty: 'cardiology' },
      { ...ok, id: 'd-suspended', slug: 'dr-suspended', type: 'doctor', status: 'suspended', specialty: 'cardiology' },
      { ...ok, id: 'ph-ok', slug: 'al-dawaa', type: 'pharmacy', status: 'active', name_ar: 'صيدلية', city: 'Jeddah' },
      { id: 'ph-pending', slug: 'ph-pending', type: 'pharmacy', status: 'active', medical_review_status: 'pending' },
    ]);
    await db.collection('facilities').insertMany([
      { ...ok, id: 'f-ok', slug: 'kfsh', is_active: true, name_ar: 'م' },
      { id: 'f-hidden', slug: 'hidden', is_active: true, public_eligibility: false, medical_review_status: 'pending' },
    ]);
    await db.collection('medicines').insertMany([
      { ...ok, id: 'm-ok', slug: 'panadol', active_ingredient: 'Paracetamol' },
      { id: 'm-pending', slug: 'pending-drug', active_ingredient: 'Paracetamol', public_eligibility: false, medical_review_status: 'pending' },
    ]);
    const conditions = conn.model('Condition', ConditionSchema);
    await conditions.create({ code: 'chest-pain', name_ar: 'ألم', name_en: 'Chest pain', specialties: ['cardiology'], relevant_ingredients: ['Paracetamol'], is_active: true });
    svc = new EntityGraphService(conditions as any, {} as any, conn, {} as any);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('an unreviewed or suspended doctor is not found; a public one is', async () => {
    await expect(svc.getRelated('doctor', 'dr-pending')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.getRelated('doctor', 'd-suspended')).rejects.toBeInstanceOf(NotFoundException);
    const r: any = await svc.getRelated('doctor', 'dr-ok');
    expect(r.entity.id).toBe('d-ok');
    expect(r.relationships.facility?.slug).toBe('kfsh');
  });

  it('a doctor with no rating shows none (never a default)', async () => {
    const r: any = await svc.getRelated('doctor', 'dr-ok');
    expect(r.entity.rating).toBeNull();
    expect(r.entity.consultation_modes).toEqual(['video']);
  });

  it('a pharmacy page reads the reviewed pharmacy profile', async () => {
    const r: any = await svc.getRelated('pharmacy', 'al-dawaa');
    expect(r.entity).toMatchObject({ id: 'ph-ok', type: 'pharmacy', city: 'Jeddah' });
    await expect(svc.getRelated('pharmacy', 'ph-pending')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('an unreviewed facility is not found', async () => {
    await expect(svc.getRelated('facility', 'hidden')).rejects.toBeInstanceOf(NotFoundException);
    expect(((await svc.getRelated('facility', 'kfsh')) as any).relationships.doctors.map((d: any) => d.id)).toEqual(['d-ok']);
  });

  it('a medicine page and its alternatives list only reviewed medicines', async () => {
    await expect(svc.getRelated('medicine', 'pending-drug')).rejects.toBeInstanceOf(NotFoundException);
    const r: any = await svc.getRelated('medicine', 'panadol');
    expect(r.relationships.alternatives).toEqual([]);
  });

  it('a condition lists only public doctors and reviewed medicines', async () => {
    const r: any = await svc.getRelated('condition', 'chest-pain');
    expect(r.relationships.doctors.map((d: any) => d.id)).toEqual(['d-ok']);
    expect(r.relationships.relevant_medicines.map((m: any) => m.slug)).toEqual(['panadol']);
  });

  it('explore lists only public doctors and facilities', async () => {
    const r: any = await svc.explore({ specialty: 'cardiology' });
    expect(JSON.stringify(r)).not.toMatch(/d-pending|d-suspended|f-hidden/);
  });
});
