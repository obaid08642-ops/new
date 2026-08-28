import { INestApplication, VersioningType } from '@nestjs/common';
import { MODULE_METADATA } from '@nestjs/common/constants';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { createNabdahOpenApiDocument, NABDAH_ACCESS_TOKEN_SECURITY_SCHEME, NABDAH_PUBLIC_API_V1_URL } from '../config/openapi.config';
import { InsuranceController } from '../modules/insurance/insurance.controller';
import { InsuranceService } from '../modules/insurance/insurance.module';
import { UserInsuranceController } from '../modules/users/user.insurance.controller';
import { UsersInsuranceController } from '../modules/users/users.insurance.controller';
import { UsersModule } from '../modules/users/users.module';
import { UsersService } from '../modules/users/users.service';
import { ImpersonationSessionService } from '../common/impersonation-session.service';

describe('Insurance OpenAPI contracts', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [UserInsuranceController, UsersInsuranceController, InsuranceController],
      providers: [
        { provide: 'PatientProfileRepository', useValue: { findOne: jest.fn() } },
        { provide: UsersService, useValue: { getPatientProfile: jest.fn(), updatePatientProfile: jest.fn() } },
        { provide: getModelToken('PatientProfile'), useValue: {} },
        { provide: InsuranceService, useValue: { listCompanies: jest.fn().mockResolvedValue([]) } },
        { provide: JwtService, useValue: { verifyAsync: jest.fn() } },
        { provide: Reflector, useValue: { getAllAndOverride: jest.fn() } },
        { provide: ImpersonationSessionService, useValue: { validate: jest.fn() } },
        { provide: getConnectionToken(), useValue: { collection: jest.fn(), model: jest.fn() } },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
    await app.init();
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  it('publishes the canonical versioned server and named bearer scheme', () => {
    const document = createNabdahOpenApiDocument(app);

    expect(document.openapi).toMatch(/^3\.0\./);
    expect(document.servers).toEqual(expect.arrayContaining([
      expect.objectContaining({ url: NABDAH_PUBLIC_API_V1_URL }),
    ]));
    expect(document.components?.securitySchemes?.[NABDAH_ACCESS_TOKEN_SECURITY_SCHEME]).toEqual(expect.objectContaining({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    }));
  });

  it('keeps the legacy route reachable, marked deprecated, and compatibility-shaped', () => {
    const document = createNabdahOpenApiDocument(app);
    const operation = document.paths['/user/insurance']?.get;

    expect(operation).toBeDefined();
    expect(operation?.deprecated).toBe(true);
    expect(operation?.security).toEqual([{ [NABDAH_ACCESS_TOKEN_SECURITY_SCHEME]: [] }]);
    expect(operation?.responses['200']).toBeDefined();
    expect(JSON.stringify(operation?.responses['200'])).toContain('policies');
    expect(JSON.stringify(operation?.responses['200'])).toContain('insurance_policies');
    expect(operation?.responses['401']).toBeDefined();
  });

  it('documents canonical, active-projection, and company-catalog contracts distinctly', () => {
    const document = createNabdahOpenApiDocument(app);
    const canonicalGet = document.paths['/users/me/insurance']?.get;
    const canonicalPost = document.paths['/users/me/insurance']?.post;
    const activeGet = document.paths['/insurance/active']?.get;
    const companiesGet = document.paths['/insurance/companies']?.get;

    expect(canonicalGet?.security).toEqual([{ [NABDAH_ACCESS_TOKEN_SECURITY_SCHEME]: [] }]);
    const canonicalGetResponse = JSON.stringify(canonicalGet?.responses['200']);
    expect(canonicalGetResponse).toContain('Canonical insurance object');
    expect(canonicalGetResponse).toContain('"nullable":true');
    expect(canonicalGetResponse).not.toContain('"type":"null"');
    expect(JSON.stringify(canonicalPost?.responses['201'])).toContain('verified: false');
    expect(JSON.stringify(activeGet?.responses['200'])).toContain('insurance_details');
    expect(JSON.stringify(companiesGet?.responses['200'])).toContain('plans');
    expect(activeGet?.responses['403']).toBeDefined();
    expect(companiesGet?.responses['403']).toBeDefined();
  });

  it('registers the legacy controller in the users module rather than leaving a dead source file', () => {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, UsersModule);
    expect(controllers).toContain(UserInsuranceController);
  });
});
