/** UPLOAD_SCAN=defer: an upload the scanner cannot judge yet is held in quarantine; it is never waved through and never served. */
import { BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { UploadSecurityService } from './upload-security.service';
import { ClamavService, ScanVerdict, uploadScanMode, uploadScanRequired } from './clamav.service';
import { FilePendingScanException } from './pending-scan';
import { StorageService } from './storage.module';
import { MediaService } from '../media/media.service';
import { MediaController } from '../media/media.controller';

const PDF = Buffer.from('%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF\n');
const b64 = (b: Buffer) => b.toString('base64');
const scanner = (verdict: ScanVerdict) => ({ scan: jest.fn(async () => verdict) }) as unknown as ClamavService;
const DOWN: ScanVerdict = { status: 'unavailable', reason: 'clamd_unreachable' };

describe('UPLOAD_SCAN modes', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('reads required | defer | optional; unset is required in production and optional elsewhere; defer still scans', () => {
    process.env.NODE_ENV = 'production'; delete process.env.UPLOAD_SCAN;
    expect(uploadScanMode()).toBe('required');
    process.env.NODE_ENV = 'development';
    expect(uploadScanMode()).toBe('optional');
    process.env.UPLOAD_SCAN = 'DEFER';
    expect(uploadScanMode()).toBe('defer');
    expect(uploadScanRequired()).toBe(true);
    process.env.UPLOAD_SCAN = 'garbage'; process.env.NODE_ENV = 'production';
    expect(uploadScanMode()).toBe('required'); // an unknown value never loosens the production default
  });

  it('/config: uploads are available in defer mode and flagged as pending the scan while the scanner is down', async () => {
    const svc = new ClamavService();
    process.env.UPLOAD_SCAN = 'required'; delete process.env.CLAMD_HOST; delete process.env.CLAMD_SOCKET;
    expect(await svc.uploadsAvailable()).toBe(false);
    expect(await svc.uploadsPendingScan()).toBe(false);
    process.env.UPLOAD_SCAN = 'defer';
    expect(await svc.uploadsAvailable()).toBe(true);
    expect(await svc.uploadsPendingScan()).toBe(true); // no scanner configured => the file waits
  });
});

describe('a deferred upload (UPLOAD_SCAN=defer)', () => {
  const env = { ...process.env };
  beforeEach(() => { process.env.NODE_ENV = 'production'; process.env.UPLOAD_SCAN = 'defer'; });
  afterEach(() => { process.env = { ...env }; });
  const inspect = (svc: UploadSecurityService, extra: Record<string, unknown> = {}) =>
    svc.inspect({ purpose: 'prescription', declared_mime: 'application/pdf', data_base64: b64(PDF), ...extra } as never);

  it('scanner down + a caller that can quarantine: accepted as deferred, every other check still ran', async () => {
    const out = await inspect(new UploadSecurityService(scanner(DOWN)), { allow_defer: true });
    expect(out.scan).toBe('deferred');
    expect(out.detected_mime).toBe('application/pdf');
    await expect(inspect(new UploadSecurityService(scanner(DOWN)), { allow_defer: true, declared_mime: 'image/png' })).rejects.toBeInstanceOf(BadRequestException); // type mismatch still refused
    const active = Buffer.from('%PDF-1.4\n1 0 obj\n<< /OpenAction << /S /JavaScript /JS (app.alert(1)) >> >>\nendobj\n%%EOF\n');
    await expect(new UploadSecurityService(scanner(DOWN)).inspect({ purpose: 'prescription', declared_mime: 'application/pdf', data_base64: b64(active), allow_defer: true })).rejects.toThrow('pdf_active_content_refused');
  });

  it('scanner down + a caller that cannot quarantine (guest, internal): still 503, as in required mode', async () => {
    await expect(inspect(new UploadSecurityService(scanner(DOWN)))).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(inspect(new UploadSecurityService(), { allow_defer: false })).rejects.toThrow('virus_scanner_unavailable');
  });

  it('an infected file is refused even when deferral is allowed; a clean one is simply clean', async () => {
    await expect(inspect(new UploadSecurityService(scanner({ status: 'infected', signature: 'Eicar-Test-Signature' })), { allow_defer: true })).rejects.toMatchObject({ response: { code: 'file_infected' } });
    expect((await inspect(new UploadSecurityService(scanner({ status: 'clean' })), { allow_defer: true })).scan).toBe('clean');
  });

  it('required mode never defers, whatever the caller asks', async () => {
    process.env.UPLOAD_SCAN = 'required';
    await expect(inspect(new UploadSecurityService(scanner(DOWN)), { allow_defer: true })).rejects.toBeInstanceOf(ServiceUnavailableException);
  });
});

describe('nothing serves a file that has not been scanned', () => {
  const owner = { id: 'pat-1', role: 'patient' };
  const admin = { id: 'adm-1', role: 'super_admin' };

  it('storage: read and signed-url answer 423 file_pending_scan for the owner and for staff, by status or by the pending/ key', async () => {
    const row = { id: 'f1', owner_account_id: 'pat-1', visibility: 'private', deleted: false, backend: 's3', mime: 'application/pdf', original_name: 'x.pdf', size_bytes: 3 };
    const model: any = { findOne: jest.fn() };
    const service: any = new StorageService(model, new UploadSecurityService());
    service.adapter = { get: jest.fn(async () => ({ mime: 'application/pdf' })) };
    for (const pending of [{ scan_status: 'pending_scan' }, { scan_status: 'scanning' }, { external_key: 'pending/abc-x.pdf' }]) {
      model.findOne.mockResolvedValue({ ...row, ...pending });
      for (const who of [owner, admin]) {
        await expect(service.read('f1', who)).rejects.toBeInstanceOf(FilePendingScanException);
        await expect(service.signedUrl('f1', who)).rejects.toMatchObject({ status: 423, response: { code: 'file_pending_scan' } });
      }
    }
    expect(service.adapter.get).not.toHaveBeenCalled();
    // a scanned file, and a row from before the deferral existed (no scan_status), open as before
    model.findOne.mockResolvedValue({ ...row, scan_status: 'clean', external_key: 'abc-x.pdf' });
    await expect(service.read('f1', owner)).resolves.toEqual(expect.objectContaining({ id: 'f1' }));
    model.findOne.mockResolvedValue(row);
    await expect(service.read('f1', owner)).resolves.toEqual(expect.objectContaining({ id: 'f1' }));
  });

  it('storage: a public profile image that is still waiting for its scan is not shown', async () => {
    const model: any = { findOne: jest.fn(() => ({ lean: async () => ({ id: 'img', mime: 'image/jpeg', backend: 's3', visibility: 'public_read', external_url: 'https://cdn.example.test/pending/a.jpg', external_key: 'pending/a.jpg', scan_status: 'pending_scan' }) })) };
    const service = new StorageService(model, new UploadSecurityService());
    expect(await service.publicProfileImage('img')).toBeNull();
  });

  it('media: no download link is ever made for a key under pending/ (the one place every module gets its links from)', async () => {
    const media = new MediaService();
    await expect(media.generatePresignedDownloadUrl('pending/chat/u1/a.png')).rejects.toMatchObject({ status: 423, response: { code: 'file_pending_scan' } });
  });

  it('media: GET /media/:id/url answers 423 to the owner of a pending file', async () => {
    const asset = { id: 'm1', key: 'pending/report/pat-1/a.png', owner_id: 'pat-1', purpose: 'report', scan_status: 'pending_scan' };
    const assets: any = { findOne: jest.fn(() => ({ lean: async () => asset })) };
    const mediaService: any = { generatePresignedDownloadUrl: jest.fn() };
    const controller = new MediaController(mediaService, assets, {} as any, {} as any, {} as any);
    await expect(controller.signedUrl(owner, 'm1')).rejects.toBeInstanceOf(FilePendingScanException);
    expect(mediaService.generatePresignedDownloadUrl).not.toHaveBeenCalled();
  });
});
