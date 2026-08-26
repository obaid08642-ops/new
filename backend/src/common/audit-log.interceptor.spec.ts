import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AuditLogInterceptor, AUDITED_KEY } from './audit-log.interceptor';
import { getModelToken, InjectConnection } from '@nestjs/mongoose';
import { AuditService } from '../modules/security/security.module';
import { Connection } from 'mongoose';
import { of } from 'rxjs';

describe('AuditLogInterceptor', () => {
  let interceptor: AuditLogInterceptor;
  let reflector: Reflector;
  let auditService: any;
  let connection: any;
  let mockModel: any;

  beforeEach(async () => {
    reflector = {
      get: jest.fn(),
    } as any;

    auditService = {
      write: jest.fn().mockResolvedValue(null),
    };

    mockModel = {
      findOne: jest.fn().mockReturnValue({
        lean: jest.fn(),
      }),
    };

    connection = {
      model: jest.fn().mockReturnValue(mockModel),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogInterceptor,
        { provide: Reflector, useValue: reflector },
        { provide: AuditService, useValue: auditService },
        { provide: 'DatabaseConnection', useValue: connection }, // Mocked NestJS Mongoose connection token
      ],
    }).compile();

    interceptor = module.get<AuditLogInterceptor>(AuditLogInterceptor);
    // Manually override connection since InjectConnection token can be custom in NestJS testing
    (interceptor as any).connection = connection;
  });

  it('should pass through if AUDITED_KEY metadata is not present', async () => {
    reflector.get = jest.fn().mockReturnValue(null);
    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({ params: {}, headers: {} }),
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
    };
    const next: any = {
      handle: jest.fn().mockReturnValue(of({ success: true })),
    };

    const result$ = await interceptor.intercept(context, next);
    await result$.toPromise();

    expect(next.handle).toHaveBeenCalled();
    expect(auditService.write).not.toHaveBeenCalled();
  });

  it('should diff changes and log to AuditService when metadata is present', async () => {
    reflector.get = jest.fn().mockReturnValue({
      model: 'JobPosting',
      idParam: 'id',
      action: 'job_posting_update',
    });

    const mockRequest = {
      params: { id: 'job1' },
      headers: { 'user-agent': 'Jest' },
      user: { id: 'u1', role: 'admin' },
      ip: '127.0.0.1',
      body: { title: 'New Title' },
    };

    const context: any = {
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
    };

    const next: any = {
      handle: jest.fn().mockReturnValue(of({ id: 'job1' })),
    };

    // Before DB state
    mockModel.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({ id: 'job1', title: 'Old Title', salary: '10k' }),
    });

    // After DB state
    mockModel.findOne.mockReturnValueOnce({
      lean: jest.fn().mockResolvedValue({ id: 'job1', title: 'New Title', salary: '10k' }),
    });

    const result$ = await interceptor.intercept(context, next);
    await result$.toPromise();

    expect(next.handle).toHaveBeenCalled();
    expect(auditService.write).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'job_posting_update',
        user_id: 'u1',
        role: 'admin',
        ip: '127.0.0.1',
        resource_kind: 'JobPosting',
        resource_id: 'job1',
        details: expect.objectContaining({
          diff: {
            title: { old: 'Old Title', new: 'New Title' },
          },
        }),
      })
    );
  });

  it('should fail-safe and still complete request if DB queries throw an error', async () => {
    reflector.get = jest.fn().mockReturnValue({
      model: 'JobPosting',
    });

    const context: any = {
      switchToHttp: () => ({
        getRequest: () => ({ params: {}, headers: {} }),
        getResponse: () => ({}),
      }),
      getHandler: () => jest.fn(),
    };

    const next: any = {
      handle: jest.fn().mockReturnValue(of({ success: true })),
    };

    // Throw error on query
    mockModel.findOne.mockImplementation(() => {
      throw new Error('DB Offline');
    });

    const result$ = await interceptor.intercept(context, next);
    const res = await result$.toPromise();

    expect(next.handle).toHaveBeenCalled();
    expect(res).toEqual({ success: true });
  });
});
