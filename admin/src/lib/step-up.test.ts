import { describe, expect, it, vi } from 'vitest';
import { isStepUpRefusal, requestStepUpToken, stepUpAction } from './step-up';

describe('step-up', () => {
  it('recognises the backend refusals only on 403', () => {
    expect(isStepUpRefusal(403, { message: 'step_up_required' })).toBe(true);
    expect(isStepUpRefusal(403, { message: 'step_up_invalid', error: 'Forbidden' })).toBe(true);
    expect(isStepUpRefusal(403, { message: 'permission_denied' })).toBe(false);
    expect(isStepUpRefusal(401, { message: 'step_up_required' })).toBe(false);
    expect(isStepUpRefusal(403, null)).toBe(false);
  });

  it('binds the token to METHOD:/api/v1/path without the query', () => {
    expect(stepUpAction('post', '/api/admin/admin/users/abc/ban?x=1')).toBe('POST:/api/v1/admin/users/abc/ban');
    expect(stepUpAction('DELETE', '/api/admin/admin/users/a%20b')).toBe('DELETE:/api/v1/admin/users/a%20b');
  });

  it('asks for options, signs, issues for the exact action and returns the token', async () => {
    const post = vi.fn(async (path: string) => (path.endsWith('/options') ? { challenge: 'c' } : { ok: true, token: 't1' }));
    const assert = vi.fn(async () => ({ id: 'cred' }));
    const token = await requestStepUpToken('POST:/api/v1/admin/users/1/ban', { post, assert, email: async () => 'a@b.test' });
    expect(token).toBe('t1');
    expect(assert).toHaveBeenCalledWith({ challenge: 'c' });
    expect(post).toHaveBeenLastCalledWith('/api/admin/auth/step-up/issue', { identifier: 'a@b.test', action: 'POST:/api/v1/admin/users/1/ban', response: { id: 'cred' } });
  });

  it('fails when no token comes back', async () => {
    const post = vi.fn(async () => ({ ok: true }));
    await expect(requestStepUpToken('a', { post, assert: async () => ({}), email: async () => 'x' })).rejects.toThrow('step_up_token_missing');
  });
});
