// GET /legal/archive/:id/pdf returns a legal-acceptance certificate (name, IP, device). Only its owner or
// an admin may download it; anyone else gets the same 404 as a missing archive.
import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { MongooseModule, getConnectionToken } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { randomBytes } from 'crypto';
import request from 'supertest';
import { LegalEnterpriseController } from './legal-enterprise.controller';
import { LegalEnterpriseService } from './legal-enterprise.service';
import { JwtAuthGuard } from '../../common/auth.guard';
import { WriteGuard } from '../../common/write-guard';
import { ImpersonationSessionService } from '../../common/impersonation-session.service';

jest.setTimeout(120_000);

describe('GET /legal/archive/:id/pdf: owner or admin only', () => {
  const secret = randomBytes(24).toString('hex');
  let mongo: MongoMemoryServer;
  let app: INestApplication;
  let svc: LegalEnterpriseService;
  const sign = (id: string, role: string) => new JwtService({ secret }).sign({ id, sub: id, role });
  const pdf = (token?: string) => {
    const r = request(app.getHttpServer()).get('/api/v1/legal/archive/acc-1/pdf');
    return token ? r.set('authorization', `Bearer ${token}`) : r;
  };

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    process.env.JWT_SECRET = secret;
    const moduleRef = await Test.createTestingModule({
      imports: [MongooseModule.forRoot(mongo.getUri(), { dbName: 'legal_archive_owner' })],
      controllers: [LegalEnterpriseController],
      providers: [
        LegalEnterpriseService,
        { provide: JwtService, useValue: new JwtService({ secret }) },
        Reflector,
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: WriteGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    svc = moduleRef.get(LegalEnterpriseService);
    await moduleRef.get<Connection>(getConnectionToken()).collection('legal_archives').insertOne({
      acceptance_id: 'acc-1', user_id: 'pat-owner', user_name: 'Owner Name', user_role: 'patient',
      policy_key: 'terms', policy_title: 'Terms', version: '1.0', effective_date: new Date(), timestamp: new Date(),
      ip: '10.0.0.1', device: 'dev-1', platform: 'web', sha256: 'f'.repeat(64),
    });
  });
  afterAll(async () => { await app?.close(); await mongo?.stop(); });

  it('the owner downloads the certificate', async () => {
    const r = await pdf(sign('pat-owner', 'patient'));
    expect(r.status).toBe(200);
    expect(r.headers['content-type']).toContain('application/pdf');
  });

  it('another signed-in patient gets 404, as for a missing archive', async () => {
    const r = await pdf(sign('pat-other', 'patient'));
    expect(r.status).toBe(404);
    expect(JSON.stringify(r.body)).not.toContain('Owner Name');
  });

  it('a provider who is not the owner gets 404', async () => {
    expect((await pdf(sign('prov-1', 'doctor'))).status).toBe(404);
  });

  it('an admin may read any certificate (service rule; the admin HTTP path also needs an enrolled device)', async () => {
    expect(await svc.acceptancePdf('acc-1', { id: 'adm-1', role: 'admin' })).not.toBeNull();
    expect(await svc.acceptancePdf('acc-1', { id: 'adm-2', role: 'super_admin' })).not.toBeNull();
    expect(await svc.acceptancePdf('acc-1', { id: 'pat-other', role: 'patient' })).toBeNull();
  });

  it('no token: 401', async () => {
    expect((await pdf()).status).toBe(401);
  });
});
