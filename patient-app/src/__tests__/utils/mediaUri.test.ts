import { apiMediaUri } from '../../utils/mediaUri';

describe('apiMediaUri (2-app#13)', () => {
  it('puts the API origin in front of the server\'s public media route', () => {
    expect(apiMediaUri('/api/v1/care/doctors/d1/media/m1', 'https://api.nabd.plus/api/v1')).toBe('https://api.nabd.plus/api/v1/care/doctors/d1/media/m1');
    expect(apiMediaUri('/api/v1/care/doctors/d1/media/m1', 'http://localhost:8002/api/v1/')).toBe('http://localhost:8002/api/v1/care/doctors/d1/media/m1');
  });
  it('keeps a full address and drops a bare file id', () => {
    expect(apiMediaUri('https://cdn.nabd.plus/a.jpg')).toBe('https://cdn.nabd.plus/a.jpg');
    expect(apiMediaUri('f3a9c1')).toBeUndefined();
    expect(apiMediaUri(undefined)).toBeUndefined();
  });
});
