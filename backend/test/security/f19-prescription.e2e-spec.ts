/**
 * F19 prescription provenance: patient uploads land in UPLOADED_BY_PATIENT
 * (never CREATED_BY_DOCTOR), and Rx-required items cannot reach APPROVED
 * without pharmacist verification. Uses the REAL PrescriptionsService with
 * in-memory model/medicine fakes so the transition machine itself is tested.
 */
import { INestApplication, VersioningType } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Appointment } from '../../src/schemas/appointment.schema';
import { ProviderProfile } from '../../src/schemas/provider-profile.schema';
import { PrescriptionState } from '../../src/common/enums';
import { PrescriptionsController } from '../../src/modules/prescriptions/prescriptions.controller';
import { PrescriptionsService } from '../../src/modules/prescriptions/prescriptions.service';
import { MedicinesService } from '../../src/modules/medicines/medicines.service';
import { JwtAuthGuard } from '../../src/common/auth.guard';
import { WriteGuard } from '../../src/common/write-guard';
import { ImpersonationSessionService } from '../../src/common/impersonation-session.service';
import { TEST_JWT_SECRET, signToken, tokenFor, post } from './harness';

describe('F19 prescription provenance + pharmacist verification gate', () => {
  let app: INestApplication;
  // One prescription: sent to pharm-1 with a catalog Rx item, unverified.
  const rxDoc: any = {
    id: 'rx-1',
    patient_id: 'patient-1',
    pharmacy_id: 'pharm-1',
    state: PrescriptionState.SENT_TO_PHARMACY,
    items: [{ medicine_id: 'med-rx-1', medicine_name_ar: 'دواء' }],
    verified_by: undefined,
    save: async function (this: any) { return this; },
    toObject: function (this: any) { return { ...this }; },
  };
  const model = {
    findOne: jest.fn(async ({ id }: any) => (id === 'rx-1' ? rxDoc : null)),
    create: jest.fn(async (doc: any) => ({ ...doc, toObject: () => ({ ...doc }) })),
  };
  const medicines = { getById: jest.fn(async () => ({ id: 'med-rx-1', requires_prescription: true })) };

  beforeAll(async () => {
    process.env.JWT_SECRET = TEST_JWT_SECRET;
    const moduleRef = await Test.createTestingModule({
      controllers: [PrescriptionsController],
      providers: [
        PrescriptionsService,
        { provide: 'PrescriptionRepository', useValue: model },
        { provide: MedicinesService, useValue: medicines },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: getModelToken(Appointment.name), useValue: {} },
        { provide: getModelToken(ProviderProfile.name), useValue: {} },
        { provide: JwtService, useValue: new JwtService({ secret: TEST_JWT_SECRET }) },
        Reflector,
        { provide: getConnectionToken(), useValue: { collection: () => ({ findOne: async () => null }), model: () => null } },
        { provide: ImpersonationSessionService, useValue: {} },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: WriteGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });
  afterAll(async () => { await app?.close(); });

  it('patient upload lands in UPLOADED_BY_PATIENT (never CREATED_BY_DOCTOR)', async () => {
    const res = await post(app, '/api/v1/prescriptions/upload', tokenFor('patient-1', 'patient'), {
      upload_image: 'img', items: [], notes: '',
    });
    expect([200, 201]).toContain(res.status);
    expect(model.create).toHaveBeenCalledWith(expect.objectContaining({ state: 'UPLOADED_BY_PATIENT' }));
  });

  it('pharmacy cannot APPROVE an Rx prescription before verification → 400', async () => {
    await post(app, '/api/v1/prescriptions/rx-1/transition', tokenFor('pharm-1', 'pharmacy'), { to: PrescriptionState.APPROVED }).expect(400);
  });

  it('after VERIFIED_BY_PHARMACIST, APPROVED is reachable → 2xx', async () => {
    const v = await post(app, '/api/v1/prescriptions/rx-1/verify', tokenFor('pharm-1', 'pharmacy'), {});
    expect([200, 201]).toContain(v.status);
    expect(rxDoc.state).toBe(PrescriptionState.VERIFIED_BY_PHARMACIST);
    expect(rxDoc.verified_by).toBe('pharm-1');
    const a = await post(app, '/api/v1/prescriptions/rx-1/transition', tokenFor('pharm-1', 'pharmacy'), { to: PrescriptionState.APPROVED });
    expect([200, 201]).toContain(a.status);
  });

  it('patient cannot verify (pharmacy/admin only) → 403', async () => {
    await post(app, '/api/v1/prescriptions/rx-1/verify', tokenFor('patient-1', 'patient'), {}).expect(403);
  });
});
