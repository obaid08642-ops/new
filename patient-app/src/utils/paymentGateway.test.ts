import { gatewayDownKey } from './paymentGateway';

describe('gatewayDownKey', () => {
  it('maps the unconfigured-gateway and return-address refusals to the translated sentence', () => {
    expect(gatewayDownKey(new Error('payment_gateway_not_configured'))).toBe('pharmacy.pay.err.gateway');
    expect(gatewayDownKey({ message: 'payment_return_url_not_configured' })).toBe('pharmacy.pay.err.gateway');
    expect(gatewayDownKey('payment_gateway_unavailable')).toBe('pharmacy.pay.err.gateway');
  });
  it('leaves every other failure alone', () => {
    expect(gatewayDownKey(new Error('booking_already_paid'))).toBeNull();
    expect(gatewayDownKey(null)).toBeNull();
  });
});
