import { mongoDirectConnection } from './mongo-uri';

describe('mongoDirectConnection (P14.28)', () => {
  it('keeps the direct connection for the one-host production URL', () => {
    expect(mongoDirectConnection('mongodb://u:p@mongodb:27017/?authSource=admin', '')).toBe(true);
    expect(mongoDirectConnection('mongodb://127.0.0.1:27017/?replicaSet=rs0&directConnection=true', '')).toBe(true);
    expect(mongoDirectConnection(undefined, '')).toBe(true);
  });
  it('discovers the set when the URL lists several hosts, or is an SRV record', () => {
    expect(mongoDirectConnection('mongodb://u:p@m1:27017,m2:27017,m3:27017/?replicaSet=rs0&authSource=admin', '')).toBe(false);
    expect(mongoDirectConnection('mongodb+srv://u:p@cluster.example.net/db', '')).toBe(false);
  });
  it('follows MONGO_DIRECT_CONNECTION when it is set', () => {
    expect(mongoDirectConnection('mongodb://mongodb:27017/?replicaSet=rs0', 'false')).toBe(false);
    expect(mongoDirectConnection('mongodb://m1,m2/', 'TRUE')).toBe(true);
  });
});
