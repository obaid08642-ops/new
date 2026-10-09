jest.mock('../../../api/provider', () => ({
  ProviderApi: { start: jest.fn(), onboardingLogin: jest.fn(), uploadFile: jest.fn(), uploadSignature: jest.fn() },
}));

import { ProviderApi } from '../../../api/provider';
import { apiMessage, createUploader, fileKind, firstMissingDoc, startOnboardingAccount } from '../kit';

const api = ProviderApi as unknown as Record<'start' | 'onboardingLogin' | 'uploadFile' | 'uploadSignature', jest.Mock>;

beforeEach(() => Object.values(api).forEach((f) => f.mockReset()));

describe('fileKind', () => {
  it('reads the mime type from the file name and defaults to a jpeg photo', () => {
    expect(fileKind('file:///c/a.PDF')).toEqual({ mime: 'application/pdf', ext: 'pdf' });
    expect(fileKind('file:///c/a.png?x=1')).toEqual({ mime: 'image/png', ext: 'png' });
    expect(fileKind('file:///c/IMG_1.heic')).toEqual({ mime: 'image/heic', ext: 'heic' });
    expect(fileKind('content://media/42')).toEqual({ mime: 'image/jpeg', ext: 'jpg' });
  });
});

describe('createUploader', () => {
  it('uploads a file once however many steps ask for it, with its own mime and name', async () => {
    api.uploadFile.mockResolvedValue('id-1');
    const up = createUploader();
    const [a, b] = await Promise.all([up.file('file:///c/cr.pdf', 'cr'), up.file('file:///c/cr.pdf', 'cr_document')]);
    expect([a, b]).toEqual(['id-1', 'id-1']);
    expect(api.uploadFile).toHaveBeenCalledTimes(1);
    expect(api.uploadFile).toHaveBeenCalledWith('file:///c/cr.pdf', 'application/pdf', 'cr.pdf');
  });

  it('does not upload a remote url and tries again after a failed upload', async () => {
    const up = createUploader();
    expect(await up.file('https://cdn.test/a.jpg', 'x')).toBe('https://cdn.test/a.jpg');
    expect(api.uploadFile).not.toHaveBeenCalled();
    api.uploadFile.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce('id-2');
    await expect(up.file('file:///c/m.jpg', 'moh')).rejects.toThrow('offline');
    expect(await up.file('file:///c/m.jpg', 'moh')).toBe('id-2');
  });

  it('uploads the signature once per drawn signature', async () => {
    api.uploadSignature.mockResolvedValue('sig-1');
    const up = createUploader();
    expect(await up.signature('data:image/png;base64,AAA')).toBe('sig-1');
    expect(await up.signature('data:image/png;base64,AAA')).toBe('sig-1');
    expect(api.uploadSignature).toHaveBeenCalledTimes(1);
    api.uploadSignature.mockResolvedValue('sig-2');
    expect(await up.signature('data:image/png;base64,BBB')).toBe('sig-2');
  });
});

describe('firstMissingDoc', () => {
  it('names the first required document that is empty', () => {
    const docs = [{ field: 'a' as const, ar: 'أ', en: 'A' }, { field: 'b' as const, ar: 'ب', en: 'B' }];
    expect(firstMissingDoc({ a: 'x', b: '' }, docs)?.en).toBe('B');
    expect(firstMissingDoc({ a: 'x', b: 'y' }, docs)).toBeNull();
  });
});

describe('startOnboardingAccount', () => {
  const p = { phone: '0501234567', password: 'x', full_name: 'N', email: 'n@e.com', type: 'pharmacy' };

  it('creates the identity and signs in as it', async () => {
    expect(await startOnboardingAccount(p, 'pharmacy')).toEqual({ ok: true });
    expect(api.start).toHaveBeenCalledWith(p);
    expect(api.onboardingLogin).toHaveBeenCalledWith('n@e.com', 'x', 'pharmacy');
  });

  it('signs in alone when the identity already exists', async () => {
    api.start.mockRejectedValue(new Error('exists'));
    expect(await startOnboardingAccount(p, 'pharmacy')).toEqual({ ok: true });
    expect(api.onboardingLogin).toHaveBeenCalledTimes(1);
  });

  it('returns the start error when sign-in fails too', async () => {
    api.start.mockRejectedValue({ response: { data: { message: ['phone taken'] } } });
    api.onboardingLogin.mockRejectedValue(new Error('bad login'));
    expect(await startOnboardingAccount(p, 'pharmacy')).toEqual({ ok: false, message: 'phone taken' });
  });
});

describe('apiMessage', () => {
  it('prefers the server message, then the error message, then the fallback', () => {
    expect(apiMessage({ response: { data: { message: 'nope' } } })).toBe('nope');
    expect(apiMessage(new Error('boom'))).toBe('boom');
    expect(apiMessage({}, 'fallback')).toBe('fallback');
  });
});
