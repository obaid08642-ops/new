jest.mock('../src/utils/security', () => ({
  secureDelete: jest.fn(),
  secureGet: jest.fn(),
  secureSet: jest.fn(),
}));

jest.mock('../src/services/HttpClient', () => ({
  HttpClient: { request: jest.fn() },
}));

import { secureDelete, secureSet } from '../src/utils/security';
import { storeAuthSession } from './api';

describe('legacy api session storage', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not report a stored session when secure storage rejects', async () => {
    (secureSet as jest.Mock).mockRejectedValue(new Error('secure store unavailable'));

    await expect(storeAuthSession({ accessToken: 'token', refreshToken: 'refresh' })).resolves.toBeNull();
    expect(secureSet).toHaveBeenCalledTimes(1);
    expect(secureDelete).toHaveBeenCalled();
  });
});
