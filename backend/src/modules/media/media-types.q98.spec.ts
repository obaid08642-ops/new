// Q98 (Round 11): uploads trusted the client's Content-Type and served it back.
import { BadRequestException } from '@nestjs/common';

const signed: unknown[] = [];
jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(async (_client: unknown, command: { input: unknown }) => { signed.push(command.input); return 'https://signed'; }),
}));
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { verifyUpload } from './media-types';

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n');
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const HTML = Buffer.from('<html><script>alert(document.cookie)</script></html>');

describe('upload type checks (Q98)', () => {
  it('accepts a real PDF and a real PNG, storing the canonical type', () => {
    expect(verifyUpload('report.pdf', 'application/pdf', PDF)).toEqual({ ok: true, mime: 'application/pdf' });
    expect(verifyUpload('x-ray.PNG', 'image/png', PNG)).toEqual({ ok: true, mime: 'image/png' });
  });

  it('refuses text/html declared for a .pdf', () => {
    expect(verifyUpload('report.pdf', 'text/html', HTML)).toEqual({ ok: false, reason: 'mimetype_does_not_match_extension' });
  });

  it('refuses HTML bytes that claim to be a PDF', () => {
    expect(verifyUpload('report.pdf', 'application/pdf', HTML)).toEqual({ ok: false, reason: 'file_content_does_not_match_type' });
  });

  it('the multipart route refuses the forged file before storage', async () => {
    const controller = Object.create(MediaController.prototype) as MediaController & Record<string, unknown>;
    const uploadBuffer = jest.fn();
    Object.assign(controller, { mediaService: { uploadBuffer }, assets: { create: jest.fn() } });
    const file = { buffer: HTML, originalname: 'report.pdf', mimetype: 'application/pdf', size: HTML.length };
    await expect(controller.uploadFile({ id: 'p1', role: 'patient' }, file as never, { purpose: 'report' } as never)).rejects.toBeInstanceOf(BadRequestException);
    expect(uploadBuffer).not.toHaveBeenCalled();
  });

  it('there is no presigned upload route any more (it skipped every check and no client used it)', () => {
    expect((MediaController.prototype as unknown as Record<string, unknown>).getPresignedUrl).toBeUndefined();
    expect((MediaService.prototype as unknown as Record<string, unknown>).generatePresignedUploadUrl).toBeUndefined();
  });

  it('downloads are served as an attachment with the canonical type', async () => {
    const service = Object.create(MediaService.prototype) as MediaService & Record<string, unknown>;
    Object.assign(service, { bucketName: 'b', s3Client: {}, assertConfigured: () => undefined });
    await service.generatePresignedDownloadUrl('report/p1/abc.pdf', 900);
    expect(signed[0]).toEqual(expect.objectContaining({
      Key: 'report/p1/abc.pdf', ResponseContentType: 'application/pdf', ResponseContentDisposition: 'attachment',
    }));
  });
});
