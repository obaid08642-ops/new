import { externalFetch } from '../../common/external-call';
import { NationalAddressService } from './national-address.service';

jest.mock('../../common/external-call', () => ({ externalFetch: jest.fn() }));
const fetchMock = externalFetch as jest.Mock;
const reply = (body: unknown, status = 200) => ({ ok: status < 300, status, json: async () => body });

describe('NationalAddressService', () => {
  const env = { ...process.env };
  beforeEach(() => { fetchMock.mockReset(); process.env.SPL_API_URL = 'https://spl.example/by-code?shortaddress={code}&api_key={key}'; process.env.SPL_API_KEY = 'k 1'; });
  afterAll(() => { process.env = env; });

  it('asks Saudi Post for the normalised code and returns the address', async () => {
    fetchMock.mockResolvedValue(reply({ Addresses: [{ City: 'Riyadh', Street: 'King Fahd Rd', PostCode: '12611' }] }));
    const out = await new NationalAddressService().lookup('rrrd 2929');
    expect(out).toMatchObject({ outcome: 'found', address: { short_address: 'RRRD2929', city: 'Riyadh', post_code: '12611' } });
    expect(fetchMock.mock.calls[0][0]).toBe('https://spl.example/by-code?shortaddress=RRRD2929&api_key=k%201');
  });

  it('does not call Saudi Post for something that is not a short address', async () => {
    expect(await new NationalAddressService().lookup('not-a-code')).toEqual({ outcome: 'invalid' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a 404 or an empty answer is not found; a failure, a bad status or no configuration is unavailable', async () => {
    const svc = new NationalAddressService();
    fetchMock.mockResolvedValue(reply({}, 404));
    expect(await svc.lookup('RRRD2929')).toEqual({ outcome: 'not_found' });
    fetchMock.mockResolvedValue(reply({ Addresses: [] }));
    expect(await svc.lookup('RRRD2929')).toEqual({ outcome: 'not_found' });
    fetchMock.mockResolvedValue(reply({}, 500));
    expect(await svc.lookup('RRRD2929')).toEqual({ outcome: 'unavailable' });
    fetchMock.mockRejectedValue(new Error('timeout'));
    expect(await svc.lookup('RRRD2929')).toEqual({ outcome: 'unavailable' });
    delete process.env.SPL_API_URL;
    expect(await svc.lookup('RRRD2929')).toEqual({ outcome: 'unavailable' });
    expect(svc.configured()).toBe(false);
  });
});
