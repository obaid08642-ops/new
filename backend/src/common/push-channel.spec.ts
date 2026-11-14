import { pushChannel } from './push-channel';

describe('push channel', () => {
  it('maps a call to calls and everything else to default', () => {
    expect(pushChannel('call')).toBe('calls');
    expect(pushChannel('chat')).toBe('default');
    expect(pushChannel('info')).toBe('default');
    expect(pushChannel(undefined)).toBe('default');
  });
  it('an explicit channel wins, an unknown one is ignored', () => {
    expect(pushChannel('info', 'new_order')).toBe('new_order');
    expect(pushChannel('call', 'bogus')).toBe('calls');
  });
});
