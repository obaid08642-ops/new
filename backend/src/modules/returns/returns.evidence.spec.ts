import { BadRequestException } from '@nestjs/common';
import { ReturnsService } from './returns.service';

/** R7-2: return photos are stored as owned media references and signed fresh on read. */
function serviceFor(opts: { owned?: number; assets?: any[] } = {}) {
  const service: any = Object.create(ReturnsService.prototype);
  service.conn = {
    collection: jest.fn().mockReturnValue({
      countDocuments: jest.fn().mockResolvedValue(opts.owned ?? 0),
      find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(opts.assets ?? []) }),
    }),
  };
  service.media = { generatePresignedDownloadUrl: jest.fn(async (key: string) => `https://s3.test/${key}?sig=fresh`) };
  return service;
}

describe('ReturnsService photo evidence (R7-2)', () => {
  it('accepts media references the patient owns', async () => {
    const service = serviceFor({ owned: 2 });
    await expect(service.evidenceRefs('p1', ['media:a1', 'media:a2'])).resolves.toEqual(['media:a1', 'media:a2']);
  });

  it('rejects raw URLs (a presigned URL expires after 15 minutes) and media of another user', async () => {
    await expect(serviceFor().evidenceRefs('p1', ['https://bucket/x.jpg?X-Amz-Expires=900'])).rejects.toThrow(BadRequestException);
    await expect(serviceFor({ owned: 0 }).evidenceRefs('p1', ['media:someone-else'])).rejects.toThrow('attachment_not_owned');
  });

  it('readers get a fresh signed URL for each stored reference', async () => {
    const service = serviceFor({ assets: [{ id: 'a1', key: 'report/p1/a1.png' }] });
    const row = await service.withEvidenceUrls({ id: 'r1', attached_docs: ['media:a1'] });
    expect(row.attached_docs).toEqual(['https://s3.test/report/p1/a1.png?sig=fresh']);
  });
});
