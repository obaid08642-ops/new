import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BadRequestException } from '@nestjs/common';
import { MaternityWeekContentService, MATERNITY_WEEK_COLLECTION, fetusImageUrls, parseWeek } from './maternity-week-content.service';

jest.setTimeout(60_000);

describe('Maternity weekly content (read-only, reviewed rows only)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let svc: MaternityWeekContentService;
  const prevBase = process.env.S3_PUBLIC_BASE_URL;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'maternity_week' }).asPromise();
    svc = new MaternityWeekContentService(conn);
  });
  afterAll(async () => {
    process.env.S3_PUBLIC_BASE_URL = prevBase;
    await conn.close();
    await mongo.stop();
  });
  beforeEach(async () => {
    process.env.S3_PUBLIC_BASE_URL = 'https://assets.example.test/';
    await conn.db!.collection(MATERNITY_WEEK_COLLECTION).deleteMany({});
  });

  const published = {
    week: 20,
    status: 'published',
    size_label: { ar: 'بحجم الموزة', en: 'About the size of a banana' },
    length_cm: 25.6,
    weight_g: 300,
    text: { ar: 'نص مراجع', en: 'Reviewed text' },
    has_image: true,
    reviewed_at: new Date('2026-09-01T00:00:00Z'),
    updated_at: new Date('2026-09-02T00:00:00Z'),
  };

  it('returns available:false when no reviewed row exists, without inventing content', async () => {
    await expect(svc.getWeek(12)).resolves.toEqual({ week: 12, available: false });
  });

  it('ignores draft rows', async () => {
    await conn.db!.collection(MATERNITY_WEEK_COLLECTION).insertOne({ ...published, status: 'draft' });
    await expect(svc.getWeek(20)).resolves.toEqual({ week: 20, available: false });
  });

  it('returns the published row with R2 WebP 1x/2x/3x URLs under maternity/fetus/', async () => {
    await conn.db!.collection(MATERNITY_WEEK_COLLECTION).insertOne({ ...published });
    await expect(svc.getWeek(20)).resolves.toEqual({
      week: 20,
      available: true,
      size_label: published.size_label,
      length_cm: 25.6,
      weight_g: 300,
      text: published.text,
      image: {
        '1x': 'https://assets.example.test/maternity/fetus/week-20@1x.webp',
        '2x': 'https://assets.example.test/maternity/fetus/week-20@2x.webp',
        '3x': 'https://assets.example.test/maternity/fetus/week-20@3x.webp',
      },
      reviewed_at: '2026-09-01T00:00:00.000Z',
      updated_at: '2026-09-02T00:00:00.000Z',
    });
  });

  it('links no image when the row has none uploaded or no public base is configured', async () => {
    await conn.db!.collection(MATERNITY_WEEK_COLLECTION).insertMany([{ ...published, week: 8, has_image: false }, { ...published, week: 9 }]);
    expect((await svc.getWeek(8)) as { image: unknown }).toEqual(expect.objectContaining({ available: true, image: null }));
    delete process.env.S3_PUBLIC_BASE_URL;
    expect((await svc.getWeek(9)) as { image: unknown }).toEqual(expect.objectContaining({ available: true, image: null }));
  });

  it('returns null for missing or invalid measurements instead of a guess', async () => {
    await conn.db!.collection(MATERNITY_WEEK_COLLECTION).insertOne({ ...published, week: 5, length_cm: 'x', weight_g: -1, has_image: false });
    expect(await svc.getWeek(5)).toEqual(expect.objectContaining({ available: true, length_cm: null, weight_g: null }));
  });

  it('accepts weeks 1..42 only', () => {
    expect(parseWeek('1')).toBe(1);
    expect(parseWeek('42')).toBe(42);
    for (const bad of ['0', '43', '-1', '1.5', 'abc', '007', '']) expect(() => parseWeek(bad)).toThrow(BadRequestException);
  });

  it('builds URLs only over https', () => {
    expect(fetusImageUrls(3, 'http://insecure.test')).toBeNull();
    expect(fetusImageUrls(3, 'https://a.test')?.['2x']).toBe('https://a.test/maternity/fetus/week-03@2x.webp');
  });
});
