const mockPost = jest.fn();
jest.mock('../../../api/client', () => ({ __esModule: true, default: { post: (...a: unknown[]) => mockPost(...a) } }));
const read = async (uri: string) => `b64:${uri}`;

import { MAX_VISIT_FILES, buildVisitReportBody, uploadVisitFiles } from '../visitFiles';

describe('N1 visit result files', () => {
  beforeEach(() => mockPost.mockReset());

  it('uploads each file with POST /storage/upload and returns storage ids in order', async () => {
    mockPost.mockResolvedValueOnce({ data: { id: 'f1' } }).mockResolvedValueOnce({ data: { id: 'f2' } });
    const out = await uploadVisitFiles([
      { uri: 'u1', name: 'cbc.pdf', mime: 'application/pdf' },
      { uri: 'u2', name: 'wound.jpg', mime: 'image/jpeg' },
    ], read);
    expect(mockPost).toHaveBeenNthCalledWith(1, '/storage/upload', { data_base64: 'b64:u1', mime: 'application/pdf', original_name: 'cbc.pdf' });
    expect(mockPost).toHaveBeenNthCalledWith(2, '/storage/upload', { data_base64: 'b64:u2', mime: 'image/jpeg', original_name: 'wound.jpg' });
    expect(out).toEqual([{ storage_id: 'f1', name: 'cbc.pdf' }, { storage_id: 'f2', name: 'wound.jpg' }]);
  });

  it('stops on the first failed upload and sends nothing else', async () => {
    mockPost.mockResolvedValueOnce({ data: {} });
    await expect(uploadVisitFiles([{ uri: 'u1', name: 'a.pdf', mime: 'application/pdf' }, { uri: 'u2', name: 'b.pdf', mime: 'application/pdf' }], read)).rejects.toThrow('upload_failed');
    expect(mockPost).toHaveBeenCalledTimes(1);
  });

  it('builds the visit-report body that completes the visit, with at most 10 attachments', () => {
    const many = Array.from({ length: 12 }, (_, i) => ({ storage_id: `s${i}` }));
    const body = buildVisitReportBody({ attachments: many, vitals: { pulse: 70 }, notes: ' ok ', followUp: ' rest ', signature: 'sig' });
    expect(body).toEqual({ complete: true, attachments: many.slice(0, MAX_VISIT_FILES), vitals: { pulse: 70 }, clinical_notes: 'ok', recommendations: 'rest', signature: 'sig' });
    expect(buildVisitReportBody({ attachments: [{ storage_id: 'a' }] })).toEqual({ complete: true, attachments: [{ storage_id: 'a' }] });
  });
});
