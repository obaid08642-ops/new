import { ForbiddenException } from '@nestjs/common';
import { StorageService } from './storage.module';

describe('StorageService private-media contract', () => {
  let model: any;
  let service: any;

  beforeEach(() => {
    model = { findOne: jest.fn() };
    service = new StorageService(model);
    service.adapter = { get: jest.fn(async () => ({ mime: 'application/pdf', external_url: 'https://private-origin.example/file.pdf' })) };
  });

  it('rejects a foreign user before reading a private object', async () => {
    model.findOne.mockResolvedValue({ id: 'file-1', owner_account_id: 'patient-1', visibility: 'private', deleted: false });
    await expect(service.read('file-1', { id: 'patient-2', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.adapter.get).not.toHaveBeenCalled();
  });

  it('does not expose a private object direct origin URL through authenticated read', async () => {
    model.findOne.mockResolvedValue({ id: 'file-1', owner_account_id: 'patient-1', visibility: 'private', deleted: false, mime: 'application/pdf', original_name: 'report.pdf', size_bytes: 10 });
    const result = await service.read('file-1', { id: 'patient-1', role: 'patient' });
    expect(result.external_url).toBeUndefined();
    expect(result.mime).toBe('application/pdf');
  });

  it('returns only the authenticated API stream when a private object cannot be presigned', async () => {
    model.findOne.mockResolvedValue({ id: 'file-1', owner_account_id: 'patient-1', visibility: 'private', deleted: false, backend: 's3', external_url: 'https://private-origin.example/file.pdf' });
    await expect(service.signedUrl('file-1', { id: 'patient-1', role: 'patient' })).resolves.toEqual({ url: '/api/v1/storage/file-1', expires_in: null, kind: 'api_authorized_stream' });
  });

  it('lets the super admin (the owner\'s account) read a provider\'s private document; another patient is still refused', async () => {
    model.findOne.mockResolvedValue({ id: 'lic-1', owner_account_id: 'prov-1', visibility: 'private', deleted: false, mime: 'application/pdf', original_name: 'licence.pdf', size_bytes: 10 });
    await expect(service.read('lic-1', { id: 'adm-1', role: 'super_admin' })).resolves.toEqual(expect.objectContaining({ id: 'lic-1' }));
    await expect(service.signedUrl('lic-1', { id: 'adm-1', role: 'super_admin' })).resolves.toBeTruthy();
    await expect(service.read('lic-1', { id: 'patient-2', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('lets the patient a file was shared with read it (a nurse visit attachment); other patients are refused', async () => {
    model.findOne.mockResolvedValue({ id: 'res-1', owner_account_id: 'nurse-1', shared_with: ['patient-1'], visibility: 'private', deleted: false, mime: 'application/pdf', original_name: 'result.pdf', size_bytes: 10 });
    await expect(service.read('res-1', { id: 'patient-1', role: 'patient' })).resolves.toEqual(expect.objectContaining({ id: 'res-1' }));
    await expect(service.signedUrl('res-1', { id: 'patient-1', role: 'patient' })).resolves.toBeTruthy();
    await expect(service.read('res-1', { id: 'patient-2', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
